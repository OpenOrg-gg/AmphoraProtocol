// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../IUSDA.sol";
import "./IVault.sol";
import "./IVaultController.sol";

import "../_external/CompLike.sol";
import "../_external/IERC20.sol";
import "../_external/Context.sol";
import "../_external/openzeppelin/SafeERC20Upgradeable.sol";

interface IBooster {
  function tokenToPID(address) external view returns(uint256);
  function deposit(uint256, uint256, bool) external;
  function withdraw(uint256, uint256) external;
  function pidToDepositToken(uint256) external view returns(address);
}

/// @title Vault
/// @notice our implentation of maker-vault like vault
/// major differences:
/// 1. multi-collateral
/// 2. generate interest in USDa
/// 3. can delegate voting power of contained tokens
contract Vault is IVault, Context {
  using SafeERC20Upgradeable for IERC20;

  /// @title VaultInfo struct
  /// @notice this struct is used to store the vault metadata
  /// this should reduce the cost of minting by ~15,000
  /// by limiting us to max 2**96-1 vaults
  struct VaultInfo {
    uint96 id;
    address minter;
  }
  /// @notice Metadata of vault, aka the id & the minter's address
  VaultInfo public _vaultInfo;
  IVaultController public immutable _controller;

  mapping(address => uint256) userVirtualBalance;

  /// @notice this is the unscaled liability of the vault.
  /// the number is meaningless on its own, and must be combined with the factor taken from
  /// the vaultController in order to find the true liabilitiy
  uint256 public _baseLiability;

  /// @notice checks if _msgSender is the controller of the vault
  modifier onlyVaultController() {
    require(_msgSender() == address(_controller), "sender not VaultController");
    _;
  }

  function readUserVirtualBalance(address _asset) external view returns (uint256) {
    return userVirtualBalance[_asset];
  }

  function setUserVirtualBalance(address _asset, uint256 _balance) external onlyVaultController {
    userVirtualBalance[_asset] = _balance;
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
    address Booster = IVaultController(_controller).booster();
    if(IVaultController(_controller).enabledLPTokensLookup(addr) == true){
      return userVirtualBalance[addr];
    } else {
      return IERC20(addr).balanceOf(address(this));
    }
  }

  /// @notice deposits tokens - only needed for LP tokens but can be used for any.
  /// @param addr - address of the erc20
  /// @param amount - amount of the erc20
  function depositErc20(address addr, uint256 amount) external {
    address Booster = IVaultController(_controller).booster();
    if(IVaultController(_controller).enabledTokensLookup(addr) == true){
      SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(addr), _msgSender(), address(this), amount);
    }

    if(IVaultController(_controller).enabledLPTokensLookup(addr) == true){
      address depositToken = IVaultController(_controller).LPDepositTokens(addr);
      SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(addr), _msgSender(), address(this), amount);
      uint256 PID = IBooster(Booster).tokenToPID(addr);
      IBooster(Booster).deposit(PID, amount, true);
      userVirtualBalance[addr] += amount;
    }
  }

  /// Add a stash/gague pass through claim function

  /// @notice withdraw an erc20 token from the vault
  /// this can only be called by the minter
  /// the withdraw will be denied if ones vault would become insolvent
  /// @param token_address address of erc20 token
  /// @param amount amount of erc20 token to withdraw
  function withdrawErc20(address token_address, uint256 amount) external override onlyMinter {
    address Booster = IVaultController(_controller).booster();
    if(IVaultController(_controller).enabledTokensLookup(token_address) == true){
      // transfer the token to the owner
      SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token_address), _msgSender(), amount);
      //  check if the account is solvent
      require(_controller.checkVault(_vaultInfo.id), "over-withdrawal");
      emit Withdraw(token_address, amount);
    }

    if(IVaultController(_controller).enabledLPTokensLookup(token_address) == true){
      require(userVirtualBalance[token_address] >= amount, "You don't have that balance");
      uint256 PID = IBooster(Booster).tokenToPID(token_address);
      userVirtualBalance[token_address] -= amount;
      IBooster(Booster).withdraw(PID, amount);
      require(_controller.checkVault(_vaultInfo.id), "over-withdrawal");
      emit Withdraw(token_address, amount);
    }
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
}
