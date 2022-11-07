// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./VaultControllerState.sol";
import "./IVaultController.sol";

/// @title Controller of all vaults in the USDa borrow/lend system
/// @notice VaultController contains all business logic for borrowing and lending through the protocol.
/// It is also in charge of accruing interest.
contract VaultControllerSetter is VaultControllerState, IVaultControllerSetter {
  function tokenId_tokenInfo(uint256 _id) external view returns (TokenInfo memory) {
    return _tokenId_tokenInfo[_id];
  }

  function tokenAddress_tokenId(address _token) external view returns (uint256) {
    return _tokenAddress_tokenId[_token];
  }

  /// @notice get current interest factor
  /// @return interest factor
  function interestFactor() external view returns (uint192) {
    return _interest.factor;
  }

  /// @notice get last interest time
  /// @return interest time
  function lastInterestTime() external view returns (uint64) {
    return _interest.lastTime;
  }

  /// @notice get current protocol fee
  /// @return protocol fee
  function protocolFee() external view returns (uint192) {
    return _protocolFee;
  }

  /// @notice get vault address of id
  /// @return the address of vault
  function vaultAddress(uint96 id) external view returns (address) {
    return _vaultId_vaultAddress[id];
  }

  ///@notice get vaultIDs of a particular wallet
  ///@return array of vault IDs owned by the wallet, from 0 to many
  function vaultIDs(address wallet) external view returns (uint96[] memory) {
    return _wallet_vaultIDs[wallet];
  }

  /// @notice get total base liability of all vaults
  /// @return total base liability
  function totalBaseLiability() external view returns (uint192) {
    return _totalBaseLiability;
  }

  /// @notice get the amount of vaults in the system
  /// @return the amount of vaults in the system
  function vaultsMinted() external view returns (uint96) {
    return _vaultsMinted;
  }

  /// @notice get the amount of tokens regsitered in the system
  /// @return the amount of tokens registered in the system
  function tokensRegistered() external view returns (uint256) {
    return _tokensRegistered;
  }

  /// @notice create a new vault
  /// @return address of the new vault
  function mintVault() public returns (address) {
    // increment  minted vaults
    _vaultsMinted = _vaultsMinted + 1;
    // mint the vault itself, deploying the contract
    address vault_address = address(new Vault(_vaultsMinted, _msgSender(), address(this)));
    // add the vault to our system
    _vaultId_vaultAddress[_vaultsMinted] = vault_address;

    //push new vault ID onto mapping
    _wallet_vaultIDs[_msgSender()].push(_vaultsMinted);

    // emit the event
    // emit NewVault(vault_address, _vaultsMinted, _msgSender());
    // return the vault address, allowing the caller to automatically find their vault
    return vault_address;
  }

  /// @notice register the USDa contract
  /// @param usda_address address to register as USDa
  function registerUSDa(address usda_address) external onlyOwner {
    _usda = IUSDA(usda_address);
  }

  ///  @notice get oraclemaster address
  /// @return the address
  function getOracleMaster() external view returns (address) {
    return address(_oracleMaster);
  }

  /// @notice register the OracleMaster contract
  /// @param master_oracle_address address to register as OracleMaster
  function registerOracleMaster(address master_oracle_address) external onlyOwner {
    _oracleMaster = OracleMaster(master_oracle_address);
    // emit RegisterOracleMaster(master_oracle_address);
  }

  ///  @notice get curvemaster address
  /// @return the address
  function getCurveMaster() external view returns (address) {
    return address(_curveMaster);
  }

  /// @notice register the CurveMaster address
  /// @param master_curve_address address to register as CurveMaster
  function registerCurveMaster(address master_curve_address) external onlyOwner {
    _curveMaster = CurveMaster(master_curve_address);
    // emit RegisterCurveMaster(master_curve_address);
  }

  function setFees(
    uint256 _lockFees,
    uint256 _stakerFees,
    uint256 _callerFees,
    uint256 _platform
  ) external onlyOwner {
    uint256 total = _lockFees + _stakerFees + _callerFees + _platform;
    require(total <= MaxFees);

    //values must be within certain ranges
    if (
      _lockFees >= 1000 &&
      _lockFees <= 1500 &&
      _stakerFees >= 300 &&
      _stakerFees <= 600 &&
      _callerFees >= 10 &&
      _callerFees <= 100 &&
      _platform <= 200
    ) {
      lockIncentive = _lockFees;
      stakerIncentive = _stakerFees;
      earmarkIncentive = _callerFees;
      platformFee = _platform;
    }
  }

  /// @notice update the protocol fee
  /// @param new_protocol_fee protocol fee in terms of 1e18=100%
  function changeProtocolFee(uint192 new_protocol_fee) external onlyOwner {
    require(new_protocol_fee < 1e18);
    _protocolFee = new_protocol_fee;
    // emit NewProtocolFee(new_protocol_fee);
  }

  /// @notice register a new token to be used as collateral
  /// @param token_address token to register
  /// @param LTV LTV of the token, 1e18=100%
  /// @param oracle_address oracle to attach to the token
  /// @param liquidationIncentive liquidation penalty for the token, 1e18=100%
  function registerErc20(
    address token_address,
    uint256 LTV,
    address oracle_address,
    uint256 liquidationIncentive,
    address gauge,
    bool isLP
  ) external onlyOwner {
    IVaultControllerRewards _vaultControllerRewards = IVaultControllerRewards(vaultControllerRewards);
    // the oracle must be registered & the token must be unregistered
    require(_oracleMaster._relays(oracle_address) != address(0x0), "oracle does not exist");
    require(_tokenAddress_tokenId[token_address] == 0, "token already registered");
    // check token address
    require(token_address != address(0), "!param");
    //LTV must be compatible with liquidation incentive
    require(LTV < (expScale - liquidationIncentive), "incompatible LTV");
    // increment the amount of registered token
    _tokensRegistered = _tokensRegistered + 1;
    // set & give the token an id
    _tokenAddress_tokenId[token_address] = _tokensRegistered;
    // create new wrapped token
    address wrapped_token_address = address(new WrappedToken(address(this), token_address, gauge, isLP));
    _wrappedTokenAddress_tokenAddress[wrapped_token_address] = token_address;

    {
      address _tokenFactory = _vaultControllerRewards._tokenFactory();
      address _rewardFactory = _vaultControllerRewards._rewardFactory();
      address _stashFactory = _vaultControllerRewards._stashFactory();
      // create new pool
      address depositToken = ITokenFactory(_tokenFactory).CreateDepositToken(token_address);
      address rewardPool = IRewardFactory(_rewardFactory).CreateCrvRewards(_tokensRegistered, depositToken);
      address stash = IStashFactory(_stashFactory).CreateStash(_tokensRegistered, rewardPool, wrapped_token_address);

      _vaultControllerRewards.addPool(depositToken, gauge, stash, rewardPool);
    }

    //set the token info
    _tokenId_tokenInfo[_tokensRegistered] = TokenInfo(
      isLP,
      token_address,
      oracle_address,
      wrapped_token_address,
      LTV,
      liquidationIncentive
    );

    // finally, add the token to the array of enabled tokens
    _enabledTokens.push(token_address);
    _enabledTokenLookup[token_address] = true;
    // emit RegisteredErc20(token_address, LTV, oracle_address, liquidationIncentive, isLP);
  }

  /// @notice update an existing collateral with new collateral parameters
  /// @param token_address the token to modify
  /// @param LTV new loan-to-value of the token, 1e18=100%
  /// @param oracle_address new oracle to attach to the token
  /// @param liquidationIncentive new liquidation penalty for the token, 1e18=100%
  function updateRegisteredErc20(
    address token_address,
    uint256 LTV,
    address oracle_address,
    uint256 liquidationIncentive
  ) external onlyOwner {
    // the oracle and token must both exist and be registerd
    require(_oracleMaster._relays(oracle_address) != address(0x0), "0");
    require(_tokenAddress_tokenId[token_address] != 0, "1");
    // LTV must be compatible with liquidation incentive
    require(LTV < (expScale - liquidationIncentive), "2");
    // get token id
    uint256 tokenID = _tokenAddress_tokenId[token_address];
    // update token info
    _tokenId_tokenInfo[tokenID] = TokenInfo(
      _tokenId_tokenInfo[tokenID].isLP,
      token_address,
      oracle_address,
      _tokenId_tokenInfo[tokenID].wrappedTokenAddress,
      LTV,
      liquidationIncentive
    );

    // emit UpdateRegisteredErc20(token_address, LTV, oracle_address, liquidationIncentive);
  }

  function updateTreasury(address _newTreasury) public onlyOwner {
    _treasury = _newTreasury;
  }

  function updateFeeBasis(uint256 _newFee) public onlyOwner {
    _feeBasis = _newFee;
  }

  function treasury() public view returns (address) {
    return _treasury;
  }

  function isEnabledLPToken(address _address) external view returns (bool) {
    TokenInfo memory tokenInfo = _tokenId_tokenInfo[_tokenAddress_tokenId[_address]];
    return tokenInfo.isLP;
  }
}
