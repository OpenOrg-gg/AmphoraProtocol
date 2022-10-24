// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../IUSDA.sol";
import "./IVault.sol";
import "./IVaultController.sol";
import "./IVaultControllerRewards.sol";
import "./WrappedToken.sol";

import "../_external/CompLike.sol";
import "../_external/IERC20.sol";
import "../_external/Context.sol";
import "../_external/openzeppelin/SafeERC20Upgradeable.sol";

/// @title VaultInfo struct
/// @notice this struct is used to store the vault metadata
/// this should reduce the cost of minting by ~15,000
/// by limiting us to max 2**96-1 vaults
struct VaultInfo {
  uint96 id;
  address minter;
}

struct PoolInfo {
  address depositToken;
  address gauge;
  address stash;
  address rewardPool;
}

struct TokenInfo {
  bool isLP;
  address tokenAddress;
  address oracleAddress;
  address wrappedTokenAddress;
  uint256 LTV;
  uint256 liquidationIncentive;
}

/// @title Vault
/// @notice our implentation of maker-vault like vault
/// major differences:
/// 1. multi-collateral
/// 2. generate interest in USDa
/// 3. can delegate voting power of contained tokens
contract Vault is IVault, Context {
  using SafeERC20Upgradeable for IERC20;

  /// @notice Metadata of vault, aka the id & the minter's address
  VaultInfo public _vaultInfo;
  IVaultController public immutable _controller;

  /// @notice this is the unscaled liability of the vault.
  /// the number is meaningless on its own, and must be combined with the factor taken from
  /// the vaultController in order to find the true liabilitiy
  uint256 public _baseLiability;

  /// @notice checks if _msgSender is the controller of the vault
  modifier onlyVaultController() {
    require(_msgSender() == address(_controller), "sender not VaultController");
    _;
  }

  /// @notice checks if _msgSender is the minter of the vault
  modifier onlyMinter() {
    require(_msgSender() == _vaultInfo.minter, "sender not minter");
    _;
  }

  /// @notice must be called by VaultController, else it will not be registered as a vault in system
  /// @param id_ unique id of the vault, ever increasing and tracked by VaultController
  /// @param minter_ address of the person who created this vault
  /// @param controller_address address of the VaultController
  constructor(
    uint96 id_,
    address minter_,
    address controller_address
  ) {
    _vaultInfo = VaultInfo(id_, minter_);
    _controller = IVaultController(controller_address);
  }

  /// @notice minter of the vault
  /// @return address of minter
  function minter() external view override returns (address) {
    return _vaultInfo.minter;
  }

  /// @notice id of the vault
  /// @return address of minter
  function id() external view override returns (uint96) {
    return _vaultInfo.id;
  }

  /// @notice current vault base liability
  /// @return base liability of vault
  function baseLiability() external view override returns (uint256) {
    return _baseLiability;
  }

  /// @notice get vaults balance of an erc20 token
  /// @param addr address of the erc20 token
  /// @dev scales wBTC up to normal erc20 size
  function tokenBalance(address addr) external view returns (uint256) {
    return IERC20(addr).balanceOf(address(this));
  }

  /// @notice delegate the voting power of a comp-like erc20 token to another address
  /// @param delegatee address that will receive the votes
  /// @param token_address address of comp-like erc20 token
  function delegateCompLikeTo(address delegatee, address token_address) external override onlyMinter {
    CompLike(token_address).delegate(delegatee);
  }

  /// @notice function used by the VaultController to transfer tokens
  /// callable by the VaultController only
  /// @param _token token to transfer
  /// @param _to person to send the coins to
  /// @param _amount amount of coins to move
  function controllerTransfer(
    address _token,
    address _to,
    uint256 _amount
  ) external override onlyVaultController {
    SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(_token), _to, _amount);
  }

  /// @notice function used by the VaultController to reduce a vaults liability
  /// callable by the VaultController only
  /// @param increase true to increase, false to decerase
  /// @param base_amount amount to reduce base liability by
  function modifyLiability(bool increase, uint256 base_amount) external override onlyVaultController returns (uint256) {
    if (increase) {
      _baseLiability = _baseLiability + base_amount;
    } else {
      // require statement only valid for repayment
      require(_baseLiability >= base_amount, "repay too much");
      _baseLiability = _baseLiability - base_amount;
    }
    return _baseLiability;
  }

  function depositToVault(address asset_address, uint256 amount) external override {
    address controllerRewards = _controller.vaultControllerRewards();
    IVaultControllerRewards vaultControllerRewards = IVaultControllerRewards(controllerRewards);
    IVaultController(_controller).pay_interest();
    // get pool info and token info
    uint256 _id = _controller._tokenAddress_tokenId(asset_address);
    (address depositToken, , , address rewardPool) = vaultControllerRewards.poolInfo(_id - 1);
    IVaultController.TokenInfo memory token_info = _controller.tokenId_tokenInfo(_id);
    // deposit token to the wrapped token
    WrappedToken(token_info.wrappedTokenAddress).deposit(msg.sender, amount);
    SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token_info.wrappedTokenAddress), address(this), amount);
    // deposit depositToken to reward pool
    ITokenMinter(depositToken).mint(address(this), amount);
    SafeERC20Upgradeable.safeApprove(IERC20Upgradeable(depositToken), rewardPool, 0);
    SafeERC20Upgradeable.safeApprove(IERC20Upgradeable(depositToken), rewardPool, amount);
    IRewards(rewardPool).stakeFor(address(this), amount);

    //emit Deposited(asset_address, amount);
  }

  function withdrawFromVault(address asset_address, uint256 amount) external override {
    address controllerRewards = _controller.vaultControllerRewards();
    IVaultControllerRewards vaultControllerRewards = IVaultControllerRewards(controllerRewards);
    IVaultController(_controller).pay_interest();
    // get pool info and token info
    uint256 _id = _controller._tokenAddress_tokenId(asset_address);
    IVaultController.TokenInfo memory token_info = _controller.tokenId_tokenInfo(_id);
    (address depositToken, , address stash, ) = vaultControllerRewards.poolInfo(_id - 1);
    // burn depositToken from reward pool
    ITokenMinter(depositToken).burn(address(this), amount);
    // withdraw token from the wrapped token
    WrappedToken(token_info.wrappedTokenAddress).withdraw(address(this), amount);
    // stash
    if (stash != address(0)) {
      IStash(stash).stashRewards();
    }
    SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(asset_address), msg.sender, amount);
    //  check if the account is solvent
    require(IVaultController(_controller).checkVault(_vaultInfo.id), "3");

    //emit Withdrawn(id, asset_address, amount);
  }
}
