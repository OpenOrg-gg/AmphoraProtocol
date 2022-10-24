// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/// @title VaultController Interface
/// @notice extends VaultControllerEvents
interface IVaultControllerRewards {

    struct PoolInfo {
        address depositToken;
        address gauge;
        address stash;
        address rewardPool;
    }
  // initializer
  function initialize(address convex, address tokenFactory, address rewardFactory, address stashFactory) external;

  function poolInfo(uint256) external view returns(address,address,address,address);

  // admin
  function setRewardContracts(address _rewards, address _stakerRewards) external;

  function addPool(address _depositToken, address _gauge, address _stash, address _rewardPool) external;

  //view functions
  function _treasury() external view returns (address);
  function _convex() external view returns (address);
  function _rewardFactory() external view returns (address);
  function _tokenFactory() external view returns (address);
  function _stashFactory() external view returns (address);
  function stakerRewards() external view returns (address);
  function lockRewards() external view returns (address);
  function masterMinter() external view returns (address);
  function vaultController() external view returns (address);
  function owner() external view returns (address);

}
