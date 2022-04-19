// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/// @title VaultController Interface
/// @notice Interface for interacting with the VaultController
interface IVaultController {
  // view functions
  function _lastInterestTime() external view returns(uint256);
  function InterestFactor() external view returns (uint256);

  function ProtocolFee() external view returns (uint256);

  function VaultAddress(uint256 id) external view returns (address);

  function AccountLiability(uint256 id) external view returns (uint256);

  function AccountBorrowingPower(uint256 id) external view returns (uint256);

  function TokensToLiquidate(
    uint256 id,
    address token,
    uint256 num
  ) external view returns (uint256);

  // methods
  function initialize() external;

  function mintVault() external returns (address);

  function checkAccount(uint256 id) external view returns (bool);

  function liquidate_account(
    uint256 id,
    address asset_address,
    uint256 tokenAmount
  ) external returns (uint256);

  function borrowUsdi(uint256 id, uint256 amount) external;

  function repayUSDi(uint256 id, uint256 amount) external;

  function repayAllUSDi(uint256 id) external;

  function calculateInterest() external returns (uint256);

  // admin
  function pause() external;

  function unpause() external;

  function register_oracle_master(address master_oracle_address) external;

  function register_curve_master(address master_curve_address) external;

  function change_protocol_fee(uint256 new_protocol_fee) external;

  function register_erc20(
    address token_address,
    uint256 LTV,
    address oracle_address,
    uint256 liquidationIncentive
  ) external;

  function register_usdi(address usdi_address) external;

  function update_registered_erc20(
    address token_address,
    uint256 LTV,
    address oracle_address,
    uint256 liquidationIncentive
  ) external;

  // events
  event Interest(uint256 epoch, uint256 amount, uint256 curve_val);
  event NewProtocolFee(uint256 protocol_fee);
  event RegisteredErc20(address token_address, uint256 LTVe4, address oracle_address, uint256 liquidationIncentivee4);
  event UpdateRegisteredErc20(
    address token_address,
    uint256 LTVe4,
    address oracle_address,
    uint256 liquidationIncentivee4
  );
  event NewVault(address vault_address, uint256 vaultId, address vaultOwner);
  event RegisterOracleMaster(address oracleMasterAddress);
  event RegisterCurveMaster(address curveMasterAddress);
  event BorrowUSDi(uint256 vaultId, address vaultAddress, uint256 borrowAmount);
  event RepayUSDi(uint256 vaultId, address vaultAddress, uint256 repayAmount);
  event Liquidate(uint256 vaultId, address asset_address, uint256 usdi_to_repurchase, uint256 tokens_to_liquidate);
}
