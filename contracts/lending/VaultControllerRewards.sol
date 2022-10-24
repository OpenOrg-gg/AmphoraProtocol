// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./interfaces.sol";

contract VaultControllerRewards {

  struct PoolInfo {
    address depositToken;
    address gauge;
    address stash;
    address rewardPool;
  }

  PoolInfo[] public poolInfo;

  address public _treasury;
  address public _convex;
  address public _rewardFactory;
  address public _tokenFactory;
  address public _stashFactory;

  address public stakerRewards;
  address public lockRewards;
  address public masterMinter;
  address public vaultController;
  address public owner;

  /// @notice no initialization arguments.
  function initialize(
    address convex,
    address tokenFactory,
    address rewardFactory,
    address stashFactory
  ) external {
    _treasury = address(0xcF55067b1c219A981801911622E748Ef71AC0C20);
    _convex = convex;
    _tokenFactory = tokenFactory;
    _rewardFactory = rewardFactory;
    _stashFactory = stashFactory;
    owner = msg.sender;
  }

    function setFactories(address _rfactory, address _sfactory, address _tfactory) external  {
    require(msg.sender == owner);
    //Unlike Convex, we leave these open to allow future upgrades to support new protocols
    _rewardFactory = _rfactory;
    _tokenFactory = _tfactory;
    //stash factory should be considered more safe to change
    //updating may be required to handle new types of gauges
    _stashFactory = _sfactory;
  }

  function setRewardContracts(address _rewards, address _stakerRewards) external  {
    require(msg.sender == owner);
    //also add flexibility for rewards.
    lockRewards = _rewards;
    stakerRewards = _stakerRewards;
  }

    //callback from reward contract when crv is received.
  function rewardClaimed(uint256 _pid, address _tokenEarned, address _address, uint256 _amount) external returns(bool){
    address rewardContract = poolInfo[_pid].rewardPool;
    require(msg.sender == poolInfo[_pid].stash || msg.sender == lockRewards);
    address _from = msg.sender;
    address _stash = poolInfo[_pid].stash;
    //mint reward tokens
    ITokenMinter(masterMinter).mintRewards(_address, _from, _tokenEarned, _amount, _stash);

    return true;
  }

  function addPool(address _depositToken, address _gauge, address _stash, address _rewardPool) public {
    require(msg.sender == vaultController);
    poolInfo.push(
        PoolInfo({
          depositToken: _depositToken,
          gauge: _gauge,
          stash: _stash,
          rewardPool: _rewardPool
        })
    ); 
  }

}