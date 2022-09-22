// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces.sol";
import "../_external/SafeMathClassic.sol";
import "../_external/extensions/IERC20Classic.sol";
import "../_external/extensions/AddressClassic.sol";
import "../_external/extensions/SafeERC20Classic.sol";

interface IProxyFactory {
    function clone(address _target) external returns(address);
}

contract StashFactoryV2 {
    using Address for address;

    bytes4 private constant rewarded_token = 0x16fa50b1; //rewarded_token()
    bytes4 private constant reward_tokens = 0x54c49fe9; //reward_tokens(uint256)
    bytes4 private constant rewards_receiver = 0x01ddabf1; //rewards_receiver(address)

    address public immutable operator;
    address public immutable rewardFactory;
    address public immutable proxyFactory;

    address public v3Implementation;

    constructor(address _operator, address _rewardFactory, address _proxyFactory, address _v3Implementation) public {
        operator = _operator;
        rewardFactory = _rewardFactory;
        proxyFactory = _proxyFactory;
        v3Implementation = _v3Implementation;
    }

    //Create a stash contract for the given gauge.
    //function calls are different depending on the version of curve gauges so determine which stash type is needed
    function CreateStash(uint256 _pid, address _gauge, address _staker) external returns(address){
        require(msg.sender == operator, "!authorized");
        require(v3Implementation!=address(0),"0 impl");
        address stash = IProxyFactory(proxyFactory).clone(v3Implementation);
        IStash(stash).initialize(_pid,operator,_staker,_gauge,rewardFactory);
        return stash;
    }
}