// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../_external/ERC20Detailed.sol";
import "../_external/extensions/ERC20Burnable.sol";
import "../_external/openzeppelin/AccessControl.sol";

contract VestingAmphora is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Vesting Amphora", "vAMPH") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}