// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./VaultControllerState.sol";
import "./IVaultController.sol";

contract VaultControllerCoreLogic is VaultControllerState, IVaultControllerCoreLogic {
  using SafeERC20 for IERC20;
  /// @notice any function with this modifier will call the pay_interest() function before
  modifier paysInterest() {
    pay_interest();
    _;
  }

  ///@notice any function with this modifier can be paused by USDA._pauser() in the case of an emergency
  modifier onlyPauser() {
    require(_msgSender() == _usda.pauser(), "only pauser");
    _;
  }

  /// @notice check an vault for over-collateralization. returns false if amount borrowed is greater than borrowing power.
  /// @param id the vault to check
  /// @return true = vault over-collateralized; false = vault under-collaterlized
  function checkVault(uint96 id) public view returns (bool) {
    // grab the vault by id if part of our system. revert if not
    IVault vault = getVault(id);
    // calculate the total value of the vaults liquidity
    uint256 total_liquidity_value = get_vault_borrowing_power(vault);
    // calculate the total liability of the vault
    uint256 usda_liability = truncate((vault.baseLiability() * _interest.factor));
    // if the LTV >= liability, the vault is solvent
    return (total_liquidity_value >= usda_liability);
  }

  /// @notice pause the contract
  function pause() external onlyPauser {
    _pause();
  }

  /// @notice unpause the contract
  function unpause() external onlyPauser {
    _unpause();
  }

  /// @notice borrow USDa from a vault. only vault minter may borrow from their vault
  /// @param id vault to borrow against
  /// @param amount amount of USDa to borrow
  function borrowUsdi(uint96 id, uint192 amount) external {
    _borrowUSDa(id, amount, _msgSender());
  }

  /// @notice borrow USDa from a vault and send the USDa to a specific address
  /// @notice Only vault minter may borrow from their vault
  /// @param id vault to borrow against
  /// @param amount amount of USDa to borrow
  /// @param target address to receive borrowed USDa
  function borrowUSDAto(
    uint96 id,
    uint192 amount,
    address target
  ) external {
    _borrowUSDa(id, amount, target);
  }

  /// @notice business logic to perform the USDa loan
  /// @param id vault to borrow against
  /// @param amount amount of USDa to borrow
  /// @param target address to receive borrowed USDa
  /// @dev pays interest
  function _borrowUSDa(
    uint96 id,
    uint192 amount,
    address target
  ) internal paysInterest whenNotPaused {
    // grab the vault by id if part of our system. revert if not
    IVault vault = getVault(id);
    // only the minter of the vault may borrow from their vault
    require(_msgSender() == vault.minter(), "4");
    // the base amount is the amount of USDa they wish to borrow divided by the interest factor
    uint192 base_amount = safeu192(uint256(amount * expScale) / uint256(_interest.factor));
    // base_liability should contain the vaults new liability, in terms of base units
    // true indicated that we are adding to the liability
    uint256 base_liability = vault.modifyLiability(true, base_amount);
    // increase the total base liability by the base_amount
    // the same amount we added to the vaults liability
    _totalBaseLiability = _totalBaseLiability + safeu192(base_amount);
    // now take the vaults total base liability and multiply it by the interest factor
    uint256 usda_liability = truncate(uint256(_interest.factor) * base_liability);
    // now get the LTV of the vault, aka their borrowing power, in usda
    uint256 total_liquidity_value = get_vault_borrowing_power(vault);
    // the LTV must be above the newly calculated usda_liability, else revert
    require(total_liquidity_value >= usda_liability, "5");
    // now send usda to the target, equal to the amount they are owed
    _usda.vaultControllerMint(target, amount);
    // emit the event
    // emit BorrowUSDa(id, address(vault), amount);
  }

  /// @notice borrow USDC directly from reserve
  /// @notice liability is still in USDa, and USDa must be repaid
  /// @param id vault to borrow against
  /// @param usdc_amount amount of USDC to borrow
  /// @param target address to receive borrowed USDC
  function borrowUSDCto(
    uint96 id,
    uint192 usdc_amount,
    address target
  ) external paysInterest whenNotPaused {
    uint256 amount = usdc_amount * 1e12;

    // grab the vault by id if part of our system. revert if not
    IVault vault = getVault(id);
    // only the minter of the vault may borrow from their vault
    require(_msgSender() == vault.minter(), "4");
    // the base amount is the amount of USDa they wish to borrow divided by the interest factor
    uint192 base_amount = safeu192(uint256(amount * expScale) / uint256(_interest.factor));
    // base_liability should contain the vaults new liability, in terms of base units
    // true indicated that we are adding to the liability
    uint256 base_liability = vault.modifyLiability(true, base_amount);
    // increase the total base liability by the base_amount
    // the same amount we added to the vaults liability
    _totalBaseLiability = _totalBaseLiability + safeu192(base_amount);
    // now take the vaults total base liability and multiply it by the interest factor
    uint256 usda_liability = truncate(uint256(_interest.factor) * base_liability);
    // now get the LTV of the vault, aka their borrowing power, in usda
    uint256 total_liquidity_value = get_vault_borrowing_power(vault);
    // the LTV must be above the newly calculated usda_liability, else revert
    require(total_liquidity_value >= usda_liability, "5");
    // emit the event
    // emit BorrowUSDa(id, address(vault), amount);
    //send USDC to the target from reserve instead of mint
    _usda.vaultControllerTransfer(target, usdc_amount);
  }

  /// @notice repay a vault's USDa loan. anyone may repay
  /// @param id vault to repay
  /// @param amount amount of USDa to repay
  /// @dev pays interest
  function repayUSDa(uint96 id, uint192 amount) external paysInterest whenNotPaused {
    // grab the vault by id if part of our system. revert if not
    IVault vault = getVault(id);
    // the base amount is the amount of USDa entered divided by the interest factor
    uint192 base_amount = safeu192((amount * expScale) / _interest.factor);
    // decrease the total base liability by the calculated base amount
    _totalBaseLiability = _totalBaseLiability - base_amount;
    // ensure that base_amount is lower than the vaults base liability.
    // this may not be needed, since modifyLiability *should* revert if is not true
    require(base_amount <= vault.baseLiability(), "6"); //repay all here if true?
    // decrease the vaults liability by the calculated base amount
    vault.modifyLiability(false, base_amount);
    // burn the amount of USDa submitted from the senders vault
    _usda.vaultControllerBurn(_msgSender(), amount);
    // emit the event
    // emit RepayUSDa(id, address(vault), amount);
  }

  /// @notice repay all of a vaults USDa. anyone may repay a vaults liabilities
  /// @param id the vault to repay
  /// @dev pays interest
  function repayAllUSDa(uint96 id) external paysInterest whenNotPaused {
    // grab the vault by id if part of our system. revert if not
    IVault vault = getVault(id);
    // get the total USDa liability, equal to the interest factor * vault's base liabilty
    //uint256 usda_liability = truncate(safeu192(_interest.factor * vault.baseLiability()));
    uint256 usda_liability = uint256(safeu192(truncate(_interest.factor * vault.baseLiability())));
    // decrease the total base liability by the vaults base liability
    _totalBaseLiability = _totalBaseLiability - safeu192(vault.baseLiability());
    // decrease the vaults liability by the vauls base liability
    vault.modifyLiability(false, vault.baseLiability());
    // burn the amount of USDa paid back from the vault
    _usda.vaultControllerBurn(_msgSender(), usda_liability);

    // emit RepayUSDa(id, address(vault), usda_liability);
  }

  /// @notice liquidate an underwater vault
  /// @notice vaults may be liquidated up to the point where they are exactly solvent
  /// @param id the vault liquidate
  /// @param asset_address the token the liquidator wishes to liquidate
  /// @param tokens_to_liquidate  number of tokens to liquidate
  /// @dev pays interest before liquidation
  function liquidateVault(
    uint96 id,
    address asset_address,
    uint256 tokens_to_liquidate
  ) external paysInterest whenNotPaused returns (uint256) {
    //cannot liquidate 0
    require(tokens_to_liquidate > 0, "7");
    //check for registered asset - audit L3
    require(_tokenAddress_tokenId[asset_address] != 0, "1");

    // calculate the amount to liquidate and the 'bad fill price' using liquidationMath
    // see _liquidationMath for more detailed explaination of the math
    (uint256 tokenAmount, uint256 badFillPrice) = _liquidationMath(id, asset_address, tokens_to_liquidate);
    // set tokens_to_liquidate to this calculated amount if the function does not fail
    if (tokenAmount != 0) {
      tokens_to_liquidate = tokenAmount;
    }
    // the USDa to repurchase is equal to the bad fill price multiplied by the amount of tokens to liquidate
    uint256 usda_to_repurchase = truncate(badFillPrice * tokens_to_liquidate);
    // get the vault that the liquidator wishes to liquidate
    IVault vault = getVault(id);

    //decrease the vault's liability
    vault.modifyLiability(false, (usda_to_repurchase * 1e18) / _interest.factor);

    //decrease liquidator's USDa balance
    _usda.vaultControllerBurn(_msgSender(), usda_to_repurchase);

    IVaultControllerRewards vaultControllerRewards = IVaultControllerRewards(vaultControllerRewards);
    // get pool info and token info
    uint256 poolID = _tokenAddress_tokenId[asset_address] - 1;
    (address depositToken, , address stash, ) = vaultControllerRewards.poolInfo(poolID);

    TokenInfo memory token_info = _tokenId_tokenInfo[_tokenAddress_tokenId[asset_address]];
    // withdraw and burn depositToken from reward pool
    ITokenMinter(depositToken).burn(address(this), tokens_to_liquidate);
    // withdraw token from the wrapped token
    WrappedToken(token_info.wrappedTokenAddress).withdraw(address(vault), tokens_to_liquidate);
    // stash
    if (stash != address(0)) {
      IStash(stash).stashRewards();
    }
    // transfer to the liquidator
    IERC20(asset_address).safeTransfer(_msgSender(), ((tokens_to_liquidate * _feeBasis) / 1000));
    IERC20(asset_address).safeTransfer(_msgSender(), ((tokens_to_liquidate * (1000 - _feeBasis)) / 1000));

    // this might not be needed. Will always be true because it is already implied by _liquidationMath.
    require(get_vault_borrowing_power(vault) <= _vaultLiability(id), "8");

    // emit the event
    // emit Liquidate(id, asset_address, usda_to_repurchase, tokens_to_liquidate);
    // return the amount of tokens liquidated
    return tokens_to_liquidate;
  }

  /// @notice calculate amount of tokens to liquidate for a vault
  /// @param id the vault to get info for
  /// @param asset_address the token to calculate how many tokens to liquidate
  /// @return - amount of tokens liquidatable
  /// @notice the amount of tokens owed is a moving target and changes with each block as pay_interest is called
  /// @notice this function can serve to give an indication of how many tokens can be liquidated
  /// @dev all this function does is call _liquidationMath with 2**256-1 as the amount
  function tokensToLiquidate(uint96 id, address asset_address) external view returns (uint256) {
    (
      uint256 tokenAmount, // bad fill price

    ) = _liquidationMath(id, asset_address, 2**256 - 1);
    return tokenAmount;
  }

  /// @notice internal function with business logic for liquidation math
  /// @param id the vault to get info for
  /// @param asset_address the token to calculate how many tokens to liquidate
  /// @param tokens_to_liquidate the max amount of tokens one wishes to liquidate
  /// @return the amount of tokens underwater this vault is
  /// @return the bad fill price for the token
  function _liquidationMath(
    uint96 id,
    address asset_address,
    uint256 tokens_to_liquidate
  ) internal view returns (uint256, uint256) {
    //require that the vault is solvent
    require(!checkVault(id), "9");

    IVault vault = getVault(id);

    // get token info
    TokenInfo memory tokenInfo = _tokenId_tokenInfo[_tokenAddress_tokenId[asset_address]];

    //get price of asset scaled to decimal 18
    uint256 price = _oracleMaster.getLivePrice(asset_address);

    // get price discounted by liquidation penalty
    // price * (100% - liquidationIncentive)
    uint256 badFillPrice = truncate(price * (1e18 - tokenInfo.liquidationIncentive));

    // the ltv discount is the amount of collateral value that one token provides
    uint256 ltvDiscount = truncate(price * tokenInfo.LTV);
    // this number is the denominator when calculating the max_tokens_to_liquidate
    // it is simply the badFillPrice - ltvDiscount
    uint256 denominator = badFillPrice - ltvDiscount;

    // the maximum amount of tokens to liquidate is the amount that will bring the vault to solvency
    // divided by the denominator
    uint256 max_tokens_to_liquidate = (_amountToSolvency(id) * 1e18) / denominator;

    //Cannot liquidate more than is necessary to make vault over-collateralized
    if (tokens_to_liquidate > max_tokens_to_liquidate) {
      tokens_to_liquidate = max_tokens_to_liquidate;
    }

    //Cannot liquidate more collateral than there is in the vault
    if (tokens_to_liquidate > vault.tokenBalance(tokenInfo.wrappedTokenAddress)) {
      tokens_to_liquidate = vault.tokenBalance(tokenInfo.wrappedTokenAddress);
    }

    return (tokens_to_liquidate, badFillPrice);
  }

  function patchTBL() external onlyOwner {
    uint192 total = 0;
    for (uint96 i = 1; i <= _vaultsMinted; i++) {
      IVault vault = getVault(i);
      total = total + safeu192(vault.baseLiability());
    }
    _totalBaseLiability = total;
  }

  /// @notice internal helper function to wrap getting of vaults
  /// @notice it will revert if the vault does not exist
  /// @param id id of vault
  /// @return vault IVault contract of
  function getVault(uint96 id) internal view returns (IVault vault) {
    address vault_address = _vaultId_vaultAddress[id];
    require(vault_address != address(0x0), "10");
    vault = IVault(vault_address);
  }

  ///@notice amount of USDa needed to reach even solvency
  ///@notice this amount is a moving target and changes with each block as pay_interest is called
  /// @param id id of vault
  function amountToSolvency(uint96 id) public view returns (uint256) {
    require(!checkVault(id), "9");
    return _amountToSolvency(id);
  }

  ///@notice bussiness logic for amountToSolvency
  function _amountToSolvency(uint96 id) internal view returns (uint256) {
    return _vaultLiability(id) - get_vault_borrowing_power(getVault(id));
  }

  /// @notice get vault liability of vault
  /// @param id id of vault
  /// @return amount of USDa the vault owes
  /// @dev implementation _vaultLiability
  function vaultLiability(uint96 id) external view returns (uint192) {
    return _vaultLiability(id);
  }

  ///@notice bussiness logic for vaultLiability
  function _vaultLiability(uint96 id) internal view returns (uint192) {
    address vault_address = _vaultId_vaultAddress[id];
    require(vault_address != address(0x0), "10");
    IVault vault = IVault(vault_address);
    return safeu192(truncate(vault.baseLiability() * _interest.factor));
  }

  /// @notice get vault borrowing power for vault
  /// @param id id of vault
  /// @return amount of USDa the vault owes
  /// @dev implementation in get_vault_borrowing_power
  function vaultBorrowingPower(uint96 id) external view returns (uint192) {
    return get_vault_borrowing_power(getVault(id));
  }

  /// @notice the actual implementation of get_vaultA_borrowing_power
  //solhint-disable-next-line code-complexity
  function get_vault_borrowing_power(IVault vault) private view returns (uint192) {
    uint192 total_liquidity_value = 0;
    // loop over each registed token, adding the indivuduals LTV to the total LTV of the vault
    for (uint192 i = 1; i <= _tokensRegistered; i++) {
      // get token info
      TokenInfo memory tokenInfo = _tokenId_tokenInfo[i];
      // if the ltv is 0, continue
      if (tokenInfo.LTV == 0) {
        continue;
      }
      // get the address of the token through the array of enabled tokens
      // note that index 0 of this vaultId 1, so we must subtract 1

      // the balance is the vaults token balance of the current collateral token in the loop
      uint256 balance = vault.tokenBalance(tokenInfo.wrappedTokenAddress);
      if (balance == 0) {
        continue;
      }
      // the raw price is simply the oraclemaster price of the token
      uint192 raw_price = safeu192(_oracleMaster.getLivePrice(tokenInfo.tokenAddress));
      if (raw_price == 0) {
        continue;
      }
      // the token value is equal to the price * balance * tokenLTV
      uint192 token_value = safeu192(truncate(truncate(raw_price * balance * tokenInfo.LTV)));
      // increase the LTV of the vault by the token value
      total_liquidity_value = total_liquidity_value + token_value;
    }
    return total_liquidity_value;
  }

  /// @notice calls the pay interest function
  /// @dev implementation in pay_interest
  function calculateInterest() external returns (uint256) {
    return pay_interest();
  }

  /// @notice accrue interest to borrowers and distribute it to USDa holders.
  /// this function is called before any function that changes the reserve ratio
  function pay_interest() public returns (uint256) {
    // calculate the time difference between the current block and the last time the block was called
    uint64 timeDifference = uint64(block.timestamp) - _interest.lastTime;
    // if the time difference is 0, there is no interest. this saves gas in the case that
    // if multiple users call interest paying functions in the same block
    if (timeDifference == 0) {
      return 0;
    }
    // the current reserve ratio, cast to a uint256
    uint256 ui18 = uint256(_usda.reserveRatio());
    // cast the reserve ratio now to an int in order to get a curve value
    int256 reserve_ratio = int256(ui18);

    // calculate the value at the curve. this vault controller is a USDa vault and will refernce
    // the vault at address 0
    int256 int_curve_val = _curveMaster.getValueAt(address(0x00), reserve_ratio);

    // cast the integer curve value to a u192
    uint192 curve_val = safeu192(uint256(int_curve_val));
    // calculate the amount of total outstanding loans before and after this interest accrual

    // first calculate how much the interest factor should increase by
    // this is equal to (timedifference * (curve value) / (seconds in a year)) * (interest factor)
    uint192 e18_factor_increase = safeu192(
      truncate(
        truncate((uint256(timeDifference) * uint256(1e18) * uint256(curve_val)) / (365 days + 6 hours)) *
          uint256(_interest.factor)
      )
    );
    // get the total outstanding value before we increase the interest factor
    uint192 valueBefore = safeu192(truncate(uint256(_totalBaseLiability) * uint256(_interest.factor)));
    // _interest is a struct which contains the last timestamp and the current interest factor
    // set the value of this struct to a struct containing {(current block timestamp), (interest factor + increase)}
    // this should save ~5000 gas/call
    _interest = Interest(uint64(block.timestamp), _interest.factor + e18_factor_increase);
    // using that new value, calculate the new total outstanding value
    uint192 valueAfter = safeu192(truncate(uint256(_totalBaseLiability) * uint256(_interest.factor)));

    // valueAfter - valueBefore is now equal to the true amount of interest accured
    // this mitigates rounding errors
    // the protocol's fee amount is equal to this value multiplied by the protocol fee percentage, 1e18=100%
    uint192 protocolAmount = safeu192(truncate(uint256(valueAfter - valueBefore) * uint256(_protocolFee)));
    // donate the true amount of interest less the amount which the protocol is taking for itself
    // this donation is what pays out interest to USDa holders
    _usda.vaultControllerDonate(valueAfter - valueBefore - protocolAmount);
    // send the protocol's fee to the owner of this contract.
    _usda.vaultControllerMint(owner(), protocolAmount);
    // emit the event
    // emit InterestEvent(uint64(block.timestamp), e18_factor_increase, curve_val);
    // return the interest factor increase
    return e18_factor_increase;
  }

  /// @notice helper function to view the status of a range of vaults
  /// @param start the vault to start looping
  /// @param stop the vault to stop looping
  /// @return VaultSummary[] a collection of vault information
  function vaultSummaries(uint96 start, uint96 stop) public view returns (VaultSummary[] memory) {
    VaultSummary[] memory summaries = new VaultSummary[](stop - start + 1);
    for (uint96 i = start; i <= stop; i++) {
      IVault vault = getVault(i);
      uint256[] memory tokenBalances = new uint256[](_enabledTokens.length);

      for (uint256 j = 1; j <= _enabledTokens.length; j++) {
        TokenInfo memory tokenInfo = _tokenId_tokenInfo[j];
        tokenBalances[j] = vault.tokenBalance(tokenInfo.wrappedTokenAddress);
      }
      summaries[i - start] = VaultSummary(
        i,
        this.vaultBorrowingPower(i),
        this.vaultLiability(i),
        _enabledTokens,
        tokenBalances
      );
    }
    return summaries;
  }
}
