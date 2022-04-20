// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./_external/IERC20.sol";

/// @title interface which defines the USDI contract
/// @notice to interact with the contract, usd IUSDIFull
interface IUSDI is IERC20 {

  function initialize(address reserveAddress) external;

  // getters
  function reserveRatio() external view returns (uint256);

  // business
  function deposit(uint256 usdc_amount) external;

  function withdraw(uint256 usdc_amount) external;

  // admin & internal use functions
  function pause() external;
  function unpause() external;

  function mint(uint256 usdc_amount) external;

  function burn(uint256 usdc_amount) external;

  function setVaultController(address vault_master_address) external;

  function vault_master_burn(address target, uint256 amount) external;

  function vault_master_mint(address target, uint256 amount) external;

  function vault_master_donate(uint256 amount) external;
}
