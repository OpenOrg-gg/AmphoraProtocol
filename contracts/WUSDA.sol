// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.8.9;

import {IWUSDA} from "./IWUSDA.sol";

import {IERC20} from "./_external/IERC20.sol";

import {SafeERC20} from "./_external/extensions/SafeERC20.sol";
import {ERC20} from "./_external/extensions/ERC20.sol";
// solhint-disable-next-line max-line-length
import {ERC20Permit} from "./_external/extensions/ERC20Permit.sol";

//import "hardhat/console.sol";

/**
 * @title wUSDA (Wrapped usda).
 *
 * @dev A fixed-balance ERC-20 wrapper for the usda rebasing token.
 *
 *      Users deposit usda into this contract and are minted wUSDA.
 *
 *      Each account's wUSDA balance represents the fixed percentage ownership
 *      of usda's market cap.
 *
 *      For exusdae: 100K wUSDA => 1% of the usda market cap
 *        when the usda supply is 100M, 100K wUSDA will be redeemable for 1M usda
 *        when the usda supply is 500M, 100K wUSDA will be redeemable for 5M usda
 *        and so on.
 *
 *      We call wUSDA the "wrapper" token and usda the "underlying" or "wrapped" token.
 */
contract WUSDA is IWUSDA, ERC20, ERC20Permit {
  using SafeERC20 for IERC20;

  //--------------------------------------------------------------------------
  // Constants

  /// @dev The maximum wUSDA supply.
  uint256 public constant MAX_wUSDA_SUPPLY = 30000000 * (10**18); // 30 M

  //--------------------------------------------------------------------------
  // Attributes

  /// @dev The reference to the usda token.
  address private immutable _usda;

  //--------------------------------------------------------------------------

  /// @param usda The usda ERC20 token address.
  /// @param name_ The wUSDA ERC20 name.
  /// @param symbol_ The wUSDA ERC20 symbol.
  constructor(
    address usda,
    string memory name_,
    string memory symbol_
  ) ERC20(name_, symbol_) ERC20Permit(name_) {
    _usda = usda;
  }

  //--------------------------------------------------------------------------
  // wUSDA write methods

  /// @notice Transfers usda_amount from {msg.sender} and mints wUSDA_amount.
  ///
  /// @param wUSDA_amount The amount of wUSDA_amount to mint.
  /// @return The amount of usda_amount deposited.
  function mint(uint256 wUSDA_amount) external override returns (uint256) {
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
    _deposit(_msgSender(), _msgSender(), usda_amount, wUSDA_amount);
    return usda_amount;
  }

  /// @notice Transfers usda_amount from {msg.sender} and mints wUSDA_amount,
  ///         to the specified beneficiary.
  ///
  /// @param to The beneficiary wallet.
  /// @param wUSDA_amount The amount of wUSDA_amount to mint.
  /// @return The amount of usda_amount deposited.
  function mintFor(address to, uint256 wUSDA_amount) external override returns (uint256) {
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
    _deposit(_msgSender(), to, usda_amount, wUSDA_amount);
    return usda_amount;
  }

  /// @notice Burns wUSDA_amount from {msg.sender} and transfers usda_amount back.
  ///
  /// @param wUSDA_amount The amount of wUSDA_amount to burn.
  /// @return The amount of usda withdrawn.
  function burn(uint256 wUSDA_amount) external override returns (uint256) {
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
    _withdraw(_msgSender(), _msgSender(), usda_amount, wUSDA_amount);
    return usda_amount;
  }

  /// @notice Burns wUSDA_amount from {msg.sender} and transfers usda_amount back,
  ///         to the specified beneficiary.
  ///
  /// @param to The beneficiary wallet.
  /// @param wUSDA_amount The amount of wUSDA_amount to burn.
  /// @return The amount of usda_amount withdrawn.
  function burnTo(address to, uint256 wUSDA_amount) external override returns (uint256) {
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
    _withdraw(_msgSender(), to, usda_amount, wUSDA_amount);
    return usda_amount;
  }

  /// @notice Burns all wUSDA_amount from {msg.sender} and transfers usda_amount back.
  ///
  /// @return The amount of usda_amount withdrawn.
  function burnAll() external override returns (uint256) {
    uint256 wUSDA_amount = balanceOf(_msgSender());
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
    _withdraw(_msgSender(), _msgSender(), usda_amount, wUSDA_amount);
    return usda_amount;
  }

  /// @notice Burns all wUSDA_amount from {msg.sender} and transfers usda_amount back,
  ///         to the specified beneficiary.
  ///
  /// @param to The beneficiary wallet.
  /// @return The amount of usda_amount withdrawn.
  function burnAllTo(address to) external override returns (uint256) {
    uint256 wUSDA_amount = balanceOf(_msgSender());
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
    _withdraw(_msgSender(), to, usda_amount, wUSDA_amount);
    return usda_amount;
  }

  /// @notice Transfers usda_amount from {msg.sender} and mints wUSDA_amount.
  ///
  /// @param usda_amount The amount of usda_amount to deposit.
  /// @return The amount of wUSDA_amount minted.
  function deposit(uint256 usda_amount) external override returns (uint256) {
    uint256 wUSDA_amount = _usda_to_wUSDA(usda_amount, _query_USDa_Supply());
    _deposit(_msgSender(), _msgSender(), usda_amount, wUSDA_amount);
    return wUSDA_amount;
  }

  /// @notice Transfers usda_amount from {msg.sender} and mints wUSDA_amount,
  ///         to the specified beneficiary.
  ///
  /// @param to The beneficiary wallet.
  /// @param usda_amount The amount of usda_amount to deposit.
  /// @return The amount of wUSDA_amount minted.
  function depositFor(address to, uint256 usda_amount) external override returns (uint256) {
    uint256 wUSDA_amount = _usda_to_wUSDA(usda_amount, _query_USDa_Supply());
    _deposit(_msgSender(), to, usda_amount, wUSDA_amount);
    return wUSDA_amount;
  }

  /// @notice Burns wUSDA_amount from {msg.sender} and transfers usda_amount back.
  ///
  /// @param usda_amount The amount of usda_amount to withdraw.
  /// @return The amount of burnt wUSDA_amount.
  function withdraw(uint256 usda_amount) external override returns (uint256) {
    uint256 wUSDA_amount = _usda_to_wUSDA(usda_amount, _query_USDa_Supply());
    _withdraw(_msgSender(), _msgSender(), usda_amount, wUSDA_amount);
    return wUSDA_amount;
  }

  /// @notice Burns wUSDA_amount from {msg.sender} and transfers usda_amount back,
  ///         to the specified beneficiary.
  ///
  /// @param to The beneficiary wallet.
  /// @param usda_amount The amount of usda_amount to withdraw.
  /// @return The amount of burnt wUSDA_amount.
  function withdrawTo(address to, uint256 usda_amount) external override returns (uint256) {
    uint256 wUSDA_amount = _usda_to_wUSDA(usda_amount, _query_USDa_Supply());
    _withdraw(_msgSender(), to, usda_amount, wUSDA_amount);
    return wUSDA_amount;
  }

  /// @notice Burns all wUSDA_amount from {msg.sender} and transfers usda_amount back.
  ///
  /// @return The amount of burnt wUSDA_amount.
  function withdrawAll() external override returns (uint256) {
    uint256 wUSDA_amount = balanceOf(_msgSender());
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());

    _withdraw(_msgSender(), _msgSender(), usda_amount, wUSDA_amount);
    return wUSDA_amount;
  }

  /// @notice Burns all wUSDA_amount from {msg.sender} and transfers usda_amount back,
  ///         to the specified beneficiary.
  ///
  /// @param to The beneficiary wallet.
  /// @return The amount of burnt wUSDA_amount.
  function withdrawAllTo(address to) external override returns (uint256) {
    uint256 wUSDA_amount = balanceOf(_msgSender());
    uint256 usda_amount = _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
    _withdraw(_msgSender(), to, usda_amount, wUSDA_amount);
    return wUSDA_amount;
  }

  //--------------------------------------------------------------------------
  // wUSDA view methods

  /// @return The address of the underlying "wrapped" token ie) usda.
  function underlying() external view override returns (address) {
    return _usda;
  }

  /// @return The total usda_amount held by this contract.
  function totalUnderlying() external view override returns (uint256) {
    return _wUSDA_to_USDA(totalSupply(), _query_USDa_Supply());
  }

  /// @param owner The account address.
  /// @return The usda balance redeemable by the owner.
  function balanceOfUnderlying(address owner) external view override returns (uint256) {
    return _wUSDA_to_USDA(balanceOf(owner), _query_USDa_Supply());
  }

  /// @param usda_amount The amount of usda tokens.
  /// @return The amount of wUSDA tokens exchangeable.
  function underlyingToWrapper(uint256 usda_amount) external view override returns (uint256) {
    return _usda_to_wUSDA(usda_amount, _query_USDa_Supply());
  }

  /// @param wUSDA_amount The amount of wUSDA tokens.
  /// @return The amount of usda tokens exchangeable.
  function wrapperToUnderlying(uint256 wUSDA_amount) external view override returns (uint256) {
    return _wUSDA_to_USDA(wUSDA_amount, _query_USDa_Supply());
  }

  //--------------------------------------------------------------------------
  // Private methods

  /// @dev Internal helper function to handle deposit state change.
  /// @param from The initiator wallet.
  /// @param to The beneficiary wallet.
  /// @param usda_amount The amount of usda_amount to deposit.
  /// @param wUSDA_amount The amount of wUSDA_amount to mint.
  function _deposit(
    address from,
    address to,
    uint256 usda_amount,
    uint256 wUSDA_amount
  ) private {
    IERC20(_usda).safeTransferFrom(from, address(this), usda_amount);

    _mint(to, wUSDA_amount);
  }

  /// @dev Internal helper function to handle withdraw state change.
  /// @param from The initiator wallet.
  /// @param to The beneficiary wallet.
  /// @param usda_amount The amount of usda_amount to withdraw.
  /// @param wUSDA_amount The amount of wUSDA_amount to burn.
  function _withdraw(
    address from,
    address to,
    uint256 usda_amount,
    uint256 wUSDA_amount
  ) private {
    _burn(from, wUSDA_amount);

    IERC20(_usda).safeTransfer(to, usda_amount);
  }

  /// @dev Queries the current total supply of usda.
  /// @return The current usda supply.
  function _query_USDa_Supply() private view returns (uint256) {
    return IERC20(_usda).totalSupply();
  }

  //--------------------------------------------------------------------------
  // Pure methods

  /// @dev Converts usda_amount to wUSDA amount.
  function _usda_to_wUSDA(uint256 usda_amount, uint256 total_usda_supply) private pure returns (uint256) {
    return (usda_amount * MAX_wUSDA_SUPPLY) / total_usda_supply;
  }

  /// @dev Converts wUSDA_amount amount to usda_amount.
  function _wUSDA_to_USDA(uint256 wUSDA_amount, uint256 total_usda_supply) private pure returns (uint256) {
    return (wUSDA_amount * total_usda_supply) / MAX_wUSDA_SUPPLY;
  }
}
