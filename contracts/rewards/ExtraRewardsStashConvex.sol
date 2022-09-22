// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces.sol";
import "../_external/SafeMathClassic.sol";
import "../_external/extensions/IERC20Classic.sol";
import "../_external/extensions/AddressClassic.sol";
import "../_external/extensions/SafeERC20Classic.sol";

interface IRewardHook {
    function onRewardClaim() external;
}

//Stash v4: Stash V4 is designed for Lamp Protocol's plugin system and adapted for Amphora.
//Unlike Convex style Stashes, this Stash is designed to be generic for any protocol.
//A primary reward is declared for each BaseRewardPool
//Fees are also taken off when processing the stash, and then go straight to reward pools.
//Nothing is returned to the Booster in order to keep logic modular for supporting any new protocol.

contract ExtraRewardStashConvex {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public constant primaryReward = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
    uint256 private constant maxRewards = 8;

    uint256 public pid;
    address public operator;
    address public staker;
    address public newRewardPool;
    address public rewardFactory;
    address public Booster;
   
    mapping(address => uint256) public historicalRewards;
    bool public hasRedirected;
    bool public hasCurveRewards;

    struct TokenInfo {
        address token;
        address rewardAddress;
    }

    //use mapping+array so that we dont have to loop check each time setToken is called
    mapping(address => TokenInfo) public tokenInfo;
    address[] public tokenList;

    constructor() public {
    }

    function initialize(uint256 _pid, address _operator, address _staker, address _newRewardPool, address _rFactory, address _booster) external {
        require(newRewardPool == address(0),"!init");
        pid = _pid;
        operator = _operator;
        staker = _staker;
        newRewardPool = _newRewardPool;
        rewardFactory = _rFactory;
        Booster = _booster;
    }

    function getName() external pure returns (string memory) {
        return "convexRewardsStashV4-LampPlugin";
    }

    function tokenCount() external view returns (uint256){
        return tokenList.length;
    }
   

    //check if gauge rewards have changed
    function checkForNewRewardTokens() internal {
        for(uint256 i = 0; i < maxRewards; i++){
            address token = IConvexRewards(newRewardPool).extraRewards(i);
            if (token == address(0)) {
                break;
            }
            if(!hasCurveRewards){
                hasCurveRewards = true;
            }
            setToken(token);
        }
    }

    //register an extra reward token to be handled
    // (any new incentive that is not directly on curve gauges)
    function setExtraReward(address _token) external{
        //owner of booster can set extra rewards
        require(IDeposit(operator).owner() == msg.sender, "!owner");
        setToken(_token);
    }

    //replace a token on token list
    function setToken(address _token) internal {
        TokenInfo storage t = tokenInfo[_token];

        if(t.token == address(0)){
            //set token address
            t.token = _token;

            //check if primary
            if(_token != primaryReward){
                //create new reward contract (for NON-primary tokens only)
                (,,,address mainRewardContract,,,,) = IBooster(Booster).poolInfo(pid);
                address rewardContract = IRewardFactory(rewardFactory).CreateTokenRewards(
                    _token,
                    mainRewardContract,
                    address(this));
                
                t.rewardAddress = rewardContract;
            }
            //add token to list of known rewards
            tokenList.push(_token);
        }
    }

    //send all extra rewards to their reward contracts
    function processStash() external returns(bool){
        require(msg.sender == operator, "!operator");
        (,,,address mainRewardContract,,,,) = IBooster(Booster).poolInfo(pid);
        uint256 tCount = tokenList.length;
        for(uint i=0; i < tCount; i++){
            TokenInfo storage t = tokenInfo[tokenList[i]];
            address token = t.token;
            if(token == address(0)) continue;
            
            uint256 amount = IERC20(token).balanceOf(address(this));
            if (amount > 0) {
                IBooster(Booster).rewardClaimed(pid,token,mainRewardContract,amount);
                //booster fees
                uint256 lockIncentiveAmount = IERC20(token).balanceOf(address(this)).mul(IBooster(Booster).lockIncentive()).div(IBooster(Booster).FEE_DENOMINATOR());
                uint256 stakerIncentiveAmount = IERC20(token).balanceOf(address(this)).mul(IBooster(Booster).stakerIncentive()).div(IBooster(Booster).FEE_DENOMINATOR());
                uint256 platformFeeAmount = IERC20(token).balanceOf(address(this)).mul(IBooster(Booster).platformFee()).div(IBooster(Booster).FEE_DENOMINATOR());

                uint256 remainder = amount.sub(lockIncentiveAmount).sub(stakerIncentiveAmount).sub(platformFeeAmount);
                historicalRewards[token] = historicalRewards[token].add(remainder);

                if(token == primaryReward){
                    IERC20(token).transfer(IBooster(Booster).lockIncentiveReciever(), lockIncentiveAmount);
                    IERC20(token).transfer(IBooster(Booster).stakerIncentiveReciever(), stakerIncentiveAmount);
                    IERC20(token).transfer(IBooster(Booster).platformFeeReciever(), platformFeeAmount);
                    IERC20(token).transfer(mainRewardContract, remainder);
                    IRewards(mainRewardContract).queueNewRewards(remainder);
                } else {
                    IERC20(token).transfer(IBooster(Booster).lockIncentiveReciever(), lockIncentiveAmount);
                    IERC20(token).transfer(IBooster(Booster).stakerIncentiveReciever(), stakerIncentiveAmount);
                    IERC20(token).transfer(IBooster(Booster).platformFeeReciever(), platformFeeAmount);
                    //add to reward contract
            	    address rewards = t.rewardAddress;
            	    if(rewards == address(0)) continue;
            	    IERC20(token).safeTransfer(rewards, remainder);
            	    IRewards(rewards).queueNewRewards(remainder);
                }

            }
        }
        return true;
    }
}