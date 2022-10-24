// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/// @title OracleRelay Interface
/// @notice Interface for interacting with OracleRelay
interface IOracleRelay {
  // returns  price with 18 decimals
  function currentValue() external view returns (uint256);
  function updateOwner(address) external;
  function updateAnchor(address) external;
  function updateMain(address) external;
}
