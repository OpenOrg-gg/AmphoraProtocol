// SPDX-License-Identifier: MIT

// File: contracts\Interfaces.sol

pragma solidity 0.6.12;

import "../_external/SafeMathClassic.sol";
import "../_external/extensions/IERC20Classic.sol";
import "../_external/extensions/AddressClassic.sol";
import "../_external/extensions/SafeERC20Classic.sol";
import "../_external/extensions/ERC20Classic.sol";
import "./interfaces.sol";

interface IConvex{
    function deposit(uint256, uint256, bool) external;
    function claimRewards(uint256 _pid, address _gauge) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
    function poolInfo(uint256) external returns (address, address, address, address, address, bool);
}

contract convexStaker {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public Booster;
    address public Convex;
    address public owner;
    constructor(address _convex) public {
        Convex = _convex;
        owner = msg.sender;
    }

    function deposit(address _token, uint32 _subPID) public {
        require(msg.sender == Booster, "!auth!");

        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(_token).safeApprove(Convex, 0);
            IERC20(_token).safeApprove(Convex, balance);
            IConvex(Convex).deposit(_subPID, balance, true);
        }
    }

    function withdraw(address _token, uint256 _amount, uint32 _subPID) public returns(bool, uint256){
        require(msg.sender == Booster, "!auth");
        IConvex(Convex).withdraw(_subPID, _amount);
        IERC20(_token).safeTransfer(msg.sender, _amount);
        return (true, _amount);
    }

    function checkRewards(address _gauge) public view returns(uint256) {
        uint256 _mainAmount = IConvexRewards(_gauge).earned(address(this));
        return _mainAmount;
    }

    function claimRewards(address _gauge, address _stash) public {
        address stash = _stash;
        require(msg.sender == Booster);
        uint256 rewardsLength = IConvexRewards(_gauge).extraRewardsLength();
        address[] memory rewardPools = new address[](rewardsLength);
        rewardPools[0] = address(_gauge);
        if(rewardsLength != 0){
            uint256 max = rewardsLength;
            for(uint i=0; i<=max; i++){
                address _virtualPool = IConvexRewards(_gauge).extraRewards(i);
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
                rewardAmount = newBalance.sub(currentBalance);
                uint256 earmarkAmount = rewardAmount.mul(IBooster(Booster).earmarkIncentive()).div(IBooster(Booster).FEE_DENOMINATOR());
                reward.transfer(msg.sender, earmarkAmount);
                uint256 transferAmount = reward.balanceOf(address(this));
                reward.transfer(stash, transferAmount);
            }
        }
    }

    function updateBooster(address _booster) public {
        require(msg.sender == owner);
        Booster = _booster;
    }

    function updateConvex(address _convex) public {
        require(msg.sender == owner);
        Convex = _convex;
    }

}