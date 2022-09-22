// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces.sol";
import "../_external/SafeMathClassic.sol";
import "../_external/extensions/IERC20Classic.sol";
import "../_external/extensions/AddressClassic.sol";
import "../_external/extensions/SafeERC20Classic.sol";

contract genericBooster{
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public convex;

    address public constant crv = address(0xD533a949740bb3306d119CC777fa900bA034cd52);

    uint256 public lockIncentive = 1000; //incentive to crv stakers //this is likely cvxCRV
    uint256 public stakerIncentive = 450; //incentive to native token stakers //what is native incentive?
    uint256 public earmarkIncentive = 50; //incentive to users who spend gas to make calls
    uint256 public platformFee = 0; //possible fee to build treasury
    uint256 public constant MaxFees = 2000;
    uint256 public constant FEE_DENOMINATOR = 10000;

    address public owner;
    address public feeManager;
    address public poolManager;
    address public rewardFactory;
    address public stashFactory;
    address public tokenFactory;
    address public treasury;
    address public mainstaker;
    address public stakerRewards; //cvx rewards
    address public lockRewards; //cvxCrv rewards(crv)
    address public lockFees; //cvxCrv vecrv fees
    address public lockIncentiveReciever;
    address public stakerIncentiveReciever;
    address public platformFeeReciever;
    address public masterMinter;

    bool public isShutdown;

    struct PoolInfo {
        address lptoken;
        address token;
        address gauge;
        address crvRewards;
        address stash;
        address staker;
        uint32 subPID;
        bool shutdown;
    }

    //index(pid) -> pool
    PoolInfo[] public poolInfo;

    mapping(address => uint256) tokenToPID;
    mapping(uint256 => address) pidToDepositToken;

    event Deposited(address indexed user, uint256 indexed poolid, uint256 amount);
    event Withdrawn(address indexed user, uint256 indexed poolid, uint256 amount);

    constructor(address setstaker) public {
        isShutdown = false;
        owner = msg.sender;
        feeManager = msg.sender;
        poolManager = msg.sender;
        treasury = address(0xC9aDdaB2838C6F5444AFFFC57badb86a2E91e9Cf);
        mainstaker = setstaker;
    }

     /// SETTER SECTION ///

    function setOwner(address _owner) external {
        require(msg.sender == owner, "!auth");
        owner = _owner;
    }

    function setFeeManager(address _feeM) external {
        require(msg.sender == feeManager, "!auth");
        feeManager = _feeM;
    }

    function setPoolManager(address _poolM) external {
        require(msg.sender == poolManager, "!auth");
        poolManager = _poolM;
    }

    
    function setConvex(address _convex) external {
        require(msg.sender == owner, "!auth");
        convex = _convex;
    }

    function setFactories(address _rfactory, address _sfactory, address _tfactory) external {
        require(msg.sender == owner, "!auth");
        //Unlike Convex, we leave these open to allow future upgrades to support new protocols
         rewardFactory = _rfactory;
         tokenFactory = _tfactory;
        

        //stash factory should be considered more safe to change
        //updating may be required to handle new types of gauges
        stashFactory = _sfactory;
    }

    function setRewardContracts(address _rewards, address _stakerRewards) external {
        require(msg.sender == owner, "!auth");
            //also add flexibility for rewards.
            lockRewards = _rewards;
            stakerRewards = _stakerRewards;
    }

    function setFees(uint256 _lockFees, uint256 _stakerFees, uint256 _callerFees, uint256 _platform) external{
        require(msg.sender==feeManager, "!auth");

        uint256 total = _lockFees.add(_stakerFees).add(_callerFees).add(_platform);
        require(total <= MaxFees, ">MaxFees");

        //values must be within certain ranges     
        if(_lockFees >= 1000 && _lockFees <= 1500
            && _stakerFees >= 300 && _stakerFees <= 600
            && _callerFees >= 10 && _callerFees <= 100
            && _platform <= 200){
            lockIncentive = _lockFees;
            stakerIncentive = _stakerFees;
            earmarkIncentive = _callerFees;
            platformFee = _platform;
        }
    }

    function setTreasury(address _treasury) external {
        require(msg.sender==feeManager, "!auth");
        treasury = _treasury;
    }

    /// END SETTER SECTION ///

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    //create a new pool
    function addPool(address _lptoken, address _gauge, uint32 _subPID) external returns(bool){
        require(msg.sender==poolManager && !isShutdown, "!add");
        require(_gauge != address(0) && _lptoken != address(0),"!param");

        //the next pool's pid
        uint256 pid = poolInfo.length;

        //create a tokenized deposit
        address token = ITokenFactory(tokenFactory).CreateDepositToken(_lptoken);
        //create a reward contract for crv rewards
        address newRewardPool = IRewardFactory(rewardFactory).CreateCrvRewards(pid,token);
        //create a stash to handle extra incentives
        address stash = IStashFactory(stashFactory).CreateStash(pid,newRewardPool,mainstaker);

        //add the new pool
        poolInfo.push(
            PoolInfo({
                lptoken: _lptoken,
                token: token,
                gauge: _gauge,
                crvRewards: newRewardPool,
                stash: stash,
                staker: mainstaker,
                subPID: _subPID,
                shutdown: false
            })
        );

        tokenToPID[_lptoken] = pid;
        pidToDepositToken[pid] = token;
        return true;
    }

    //shutdown pool
    function shutdownPool(uint256 _pid) external returns(bool){
        require(msg.sender==poolManager, "!auth");
        PoolInfo storage pool = poolInfo[_pid];

        //withdraw from gauge
        try IStaker(pool.staker).withdrawAll(pool.lptoken,pool.gauge){
        }catch{}

        pool.shutdown = true;
        return true;
    }

    //shutdown this contract.
    //  unstake and pull all lp tokens to this address
    //  only allow withdrawals
    function shutdownSystem() external{
        require(msg.sender == owner, "!auth");
        isShutdown = true;

        for(uint i=0; i < poolInfo.length; i++){
            PoolInfo storage pool = poolInfo[i];
            if (pool.shutdown) continue;

            address token = pool.lptoken;
            address gauge = pool.gauge;

                //withdraw from gauge
                try IStaker(pool.staker).withdrawAll(token,gauge){
                    pool.shutdown = true;
                }catch{}
        }
    }

    //deposit lp tokens and stake
    function deposit(uint256 _pid, uint256 _amount, bool _stake) public returns(bool){
        require(!isShutdown,"shutdown");
        PoolInfo storage pool = poolInfo[_pid];
        require(pool.shutdown == false, "pool is closed");

            //send to proxy to stake
            IERC20(pool.lptoken).safeTransferFrom(msg.sender, mainstaker, _amount);

            //stake
            IStaker(pool.staker).deposit(pool.lptoken,_amount,pool.subPID);

            if(_stake){
                //mint here and send to rewards on user behalf
                ITokenMinter(pool.token).mint(address(this),_amount);
                IERC20(pool.token).safeApprove(pool.crvRewards,0);
                IERC20(pool.token).safeApprove(pool.crvRewards,_amount);
                IRewards(pool.crvRewards).stakeFor(msg.sender,_amount);
            }else{
                //add user balance directly
                ITokenMinter(pool.token).mint(msg.sender,_amount);
            }

            emit Deposited(msg.sender, _pid, _amount);
            return true;
        }

    //withdraw lp tokens
    function _withdraw(uint256 _pid, uint256 _amount, address _from, address _to) internal {
        PoolInfo storage pool = poolInfo[_pid];

            //remove lp balance
            ITokenMinter(pool.token).burn(_from,_amount);

            //pull from gauge if not shutdown
            // if shutdown tokens will be in this contract
            if (!pool.shutdown) {
                IStaker(pool.staker).withdraw(pool.token,_amount,pool.subPID);
            }

            //some gauges claim rewards when withdrawing, stash them in a seperate contract until next claim
            //do not call if shutdown since stashes wont have access
            if(pool.stash != address(0) && !isShutdown && !pool.shutdown){
                IStash(pool.stash).stashRewards();
            }
        
            //return lp tokens
            IERC20(pool.lptoken).safeTransfer(_to, _amount);

            emit Withdrawn(_to, _pid, _amount);
        
    }

    //withdraw lp tokens
    function withdraw(uint256 _pid, uint256 _amount) public returns(bool){

        _withdraw(_pid,_amount,msg.sender,msg.sender);
        return true;
    }

    //allow reward contracts to send here and withdraw to user
    function withdrawTo(uint256 _pid, uint256 _amount, address _to) external returns(bool){
        address rewardContract = poolInfo[_pid].crvRewards;
        require(msg.sender == rewardContract,"!auth");

        _withdraw(_pid,_amount,msg.sender,_to);
        return true;
    }

    //callback from reward contract when crv is received.
    function rewardClaimed(uint256 _pid, address _tokenEarned, address _address, uint256 _amount) external returns(bool){
        address rewardContract = poolInfo[_pid].crvRewards;
        require(msg.sender == poolInfo[_pid].stash || msg.sender == lockRewards, "!auth");
        address _from = msg.sender;
        address _stash = poolInfo[_pid].stash;
        //mint reward tokens
        ITokenMinter(masterMinter).mintRewards(_address, _from, _tokenEarned, _amount, _stash);
        
        return true;
    }
}