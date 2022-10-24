  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.13;

interface ITokenInfo{
  struct TokenInfo {
    bool isLP;
    address tokenAddress;
    address oracleAddress;
    address wrappedTokenAddress;
    uint256 LTV;
    uint256 liquidationIncentive;
  }
}