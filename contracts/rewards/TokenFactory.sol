// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces.sol";
import "./DepositToken.sol";
import "../_external/SafeMathClassic.sol";
import "../_external/extensions/IERC20Classic.sol";
import "../_external/extensions/AddressClassic.sol";
import "../_external/extensions/SafeERC20Classic.sol";


contract TokenFactory {
    using Address for address;

    address public operator;

    constructor(address _operator) public {
        operator = _operator;
    }

    function CreateDepositToken(address _lptoken) external returns(address){
        require(msg.sender == operator, "!authorized");

        DepositToken dtoken = new DepositToken(operator,_lptoken);
        return address(dtoken);
    }
}