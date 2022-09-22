
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../oracle/IOracleRelaySub.sol";

contract BogusOracle is IOracleRelay {

      function currentValue() external pure override returns (uint256){
        return 5e17;
      }

}