// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../_external/SafeMathClassic.sol";
import "../_external/extensions/IERC20Classic.sol";
import "../_external/extensions/AddressClassic.sol";
import "../_external/extensions/SafeERC20Classic.sol";
import "../_external/extensions/ERC20Classic.sol";


contract amphCvxToken is ERC20 {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public operator;

    constructor()
        public
        ERC20(
            "Amphora CVX",
            "amphCVX"
        )
    {
        operator = msg.sender;
    }

   function setOperator(address _operator) external {
        require(msg.sender == operator, "!auth");
        operator = _operator;
    }

    
    function mint(address _to, uint256 _amount) external {
        require(msg.sender == operator, "!authorized");
        
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external {
        require(msg.sender == operator, "!authorized");
        
        _burn(_from, _amount);
    }

}