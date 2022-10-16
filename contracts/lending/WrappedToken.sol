// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IVaultController.sol";
import "./interfaces.sol";

import "../_external/IERC20.sol";
import "../_external/extensions/SafeERC20.sol";
import "../_external/extensions/Address.sol";
import "../_external/extensions/ERC20.sol";


interface IConvex{
    function deposit(uint256, uint256, bool) external;
    function claimRewards(uint256 _pid, address _gauge) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
    function poolInfo(uint256) external returns (address, address, address, address, address, bool);
}

// @notice This contract helps vaults store and stake their deposited tokens.
// Every enabled tokens in vault controller has a corresponding WrappedToken, when users deposit into their vaults,
// vault controller will deposit their supplied tokens into this contract, and mint wrapped tokens to their vaults.
contract WrappedToken is ERC20 {
    using SafeERC20 for IERC20;
    using Address for address;

    event Deposited(address indexed _user, address indexed _account, uint256 _amount);
    event Withdrawn(address indexed _user, address indexed _account, uint256 _amount);

    address public operator; // vault controller
    address public underlying;
    address public gauge;
    uint32 public subPID;
    bool public isLP;

    constructor(
        address _operator,
        address _underlying,
        address _gaugeAddress, // for LP token
        uint32 _subPID, // for LP token
        bool _isLP
    )
        ERC20(
             string(
                abi.encodePacked("Amphora Wrapped ", ERC20(underlying).name())
            ),
            string(abi.encodePacked("ampw", ERC20(underlying).symbol()))
        )
    {
        // check reward pool params
        require(_gaugeAddress != address(0), "!param");

        operator =  _operator;
        underlying = _underlying;
        gauge = _gaugeAddress;
        subPID = _subPID;
        isLP = _isLP;
    }

    function deposit(address _from, uint256 _amount) public {
        require(msg.sender == operator, "!auth");
        // transfer funds
        IERC20(underlying).safeTransferFrom(_from, address(this), _amount);
        if (isLP) {
            // deposit token into Convex
            uint256 balance = IERC20(underlying).balanceOf(address(this));
            if (balance > 0) {
                IERC20(underlying).safeApprove(gauge, 0);
                IERC20(underlying).safeApprove(gauge, balance);
                ICurveGauge(gauge).deposit(balance);
            }
        }
        _mint(msg.sender, _amount);

        emit Deposited(msg.sender, _from, _amount);
    }

    function withdraw(address _from, uint256 _amount) public returns(bool, uint256){
        require(msg.sender == operator, "!auth");
        _burn(_from, _amount);
        if (isLP) {
            // withdraw tokens from Convex
            ICurveGauge(gauge).withdraw(_amount);
        }
        // transfer withdrawn tokens to msg sender (i.e. the operator)
        IERC20(underlying).safeTransfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _from,  _amount);
        return (true, _amount);
    }

    // This function is taken from ConvexStaker.sol
    function checkRewards() public view returns(uint256) {
        uint256 _mainAmount = IConvexRewards(gauge).earned(address(this));
        return _mainAmount;
    }

    // This function is taken from ConvexStaker.sol
    function claimRewards(address _stash) public {
        if (!isLP) {
            return;
        }
        require(msg.sender == operator, "!auth");
        uint256 rewardsLength = IConvexRewards(gauge).extraRewardsLength();
        address[] memory rewardPools = new address[](rewardsLength);
        rewardPools[0] = address(gauge);
        if(rewardsLength != 0){
            uint256 max = rewardsLength;
            for(uint i=0; i<=max; i++){
                address _virtualPool = IConvexRewards(gauge).extraRewards(i);
                rewardPools[i+1] = _virtualPool;
            }
        }

        for(uint i=0; i <= rewardsLength+1; i++){
            IERC20 reward = IERC20(IConvexRewards(rewardPools[i]).rewardToken());
            uint256 currentBalance = reward.balanceOf(address(this));
            IConvexRewards(rewardPools[i]).getReward();
            uint256 newBalance = reward.balanceOf(address(this));
            uint256 rewardAmount = 0;
            if(newBalance > currentBalance) {
                rewardAmount = newBalance - currentBalance;
                uint256 earmarkAmount = rewardAmount * IVaultController(operator).earmarkIncentive() / IVaultController(operator).FEE_DENOMINATOR();
                reward.transfer(msg.sender, earmarkAmount);
                uint256 transferAmount = reward.balanceOf(address(this));
                reward.transfer(_stash, transferAmount);
            }
        }
    }
    
    function mint(address _to, uint256 _amount) external {
        require(msg.sender == operator, "!authorized");
        
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external {
        require(msg.sender == operator, "!authorized");
        
        _burn(_from, _amount);
    }
}