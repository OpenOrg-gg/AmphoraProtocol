// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./interfaces.sol";

import "./Vault.sol";
import "./IVault.sol";

import "./IVaultController.sol";
import "./IVaultControllerRewards.sol";
import "../oracle/OracleMaster.sol";
import "../curve/CurveMaster.sol";

import "../_external/IERC20.sol";
import "../_external/compound/ExponentialNoError.sol";
import "../_external/openzeppelin/OwnableUpgradeable.sol";
import "../_external/openzeppelin/Initializable.sol";
import "../_external/openzeppelin/PausableUpgradeable.sol";
import "../_external/compound/ExponentialNoError.sol";
import "../_external/ozproxy/Proxy.sol";

/// @title Controller of all vaults in the USDa borrow/lend system
/// @notice VaultController contains all business logic for borrowing and lending through the protocol.
/// It is also in charge of accruing interest.
contract VaultControllerState is
  IVaultControllerState,
  Proxy,
  Initializable,
  PausableUpgradeable,
  ExponentialNoError,
  OwnableUpgradeable
{
  using SafeERC20 for IERC20;

  struct Interest {
    uint64 lastTime;
    uint192 factor;
  }
  Interest internal _interest;

  // mapping of vault id to vault address
  mapping(uint96 => address) internal _vaultId_vaultAddress;

  //mapping of wallet address to vault IDs []
  mapping(address => uint96[]) internal _wallet_vaultIDs;

  // mapping of token address to token info
  mapping(address => uint256) internal _tokenAddress_tokenId;

  mapping(uint256 => TokenInfo) internal _tokenId_tokenInfo;

  // when getting the live price of the underlying token of the wrapped token,
  // we need a mapping from the wrapped token address to the underlying token address
  mapping(address => address) internal _wrappedTokenAddress_tokenAddress;

  // address public lockIncentiveReciever;
  // address public stakerIncentiveReciever;
  // address public platformFeeReciever;

  address[] internal _enabledTokens;

  //mappings of the enabled tokens for gas efficient single lookup
  mapping(address => bool) internal _enabledTokenLookup;

  OracleMaster internal _oracleMaster;
  CurveMaster internal _curveMaster;

  IUSDA internal _usda;
  uint96 internal _vaultsMinted;

  uint256 internal _tokensRegistered;
  uint256 internal _lpTokensRegistered;
  uint192 internal _totalBaseLiability;
  uint192 internal _protocolFee;

  address internal _treasury;
  address internal _convex;
  uint256 internal _feeBasis;

  address public vaultControllerRewards;

  uint256 public lockIncentive = 1000; //incentive to crv stakers //this is likely cvxCRV
  uint256 public stakerIncentive = 450; //incentive to native token stakers //what is native incentive?
  uint256 public earmarkIncentive = 50; //incentive to users who spend gas to make calls
  uint256 public platformFee = 0; //possible fee to build treasury
  uint256 public constant MaxFees = 2000;
  uint256 public constant FEE_DENOMINATOR = 10000;

  address public vaultControllerCoreLogic;
  address public vaultControllerSetter;

  /// @notice no initialization arguments.
  function initialize(
    address convex,
    address _vaultControllerRewards,
    address _vaultControllerCoreLogic,
    address _vaultControllerSetter
  ) external override initializer {
    __Ownable_init();
    __Pausable_init();
    _interest = Interest(uint64(block.timestamp), 1e18);
    _protocolFee = 1e14;
    _treasury = address(0xcF55067b1c219A981801911622E748Ef71AC0C20);
    _feeBasis = 333;
    _vaultsMinted = 0;
    _tokensRegistered = 0;
    _totalBaseLiability = 0;
    _convex = convex;
    vaultControllerRewards = _vaultControllerRewards;
    vaultControllerCoreLogic = _vaultControllerCoreLogic;
    vaultControllerSetter = _vaultControllerSetter;
  }

  /// special view only function to help liquidators

  function _implementation() internal view override returns (address) {
    bytes4 sig = msg.sig;

    if (
      sig == IVaultControllerCoreLogic.checkVault.selector ||
      sig == IVaultControllerCoreLogic.pause.selector ||
      sig == IVaultControllerCoreLogic.unpause.selector ||
      sig == IVaultControllerCoreLogic.borrowUsdi.selector ||
      sig == IVaultControllerCoreLogic.borrowUSDAto.selector ||
      sig == IVaultControllerCoreLogic.borrowUSDCto.selector ||
      sig == IVaultControllerCoreLogic.repayUSDa.selector ||
      sig == IVaultControllerCoreLogic.repayAllUSDa.selector ||
      sig == IVaultControllerCoreLogic.liquidateVault.selector ||
      sig == IVaultControllerCoreLogic.tokensToLiquidate.selector ||
      sig == IVaultControllerCoreLogic.patchTBL.selector ||
      sig == IVaultControllerCoreLogic.amountToSolvency.selector ||
      sig == IVaultControllerCoreLogic.vaultLiability.selector ||
      sig == IVaultControllerCoreLogic.vaultBorrowingPower.selector ||
      sig == IVaultControllerCoreLogic.calculateInterest.selector ||
      sig == IVaultControllerCoreLogic.pay_interest.selector ||
      sig == IVaultControllerCoreLogic.vaultSummaries.selector
    ) {
      return vaultControllerCoreLogic;
    } else {
      return vaultControllerSetter;
    }
  }
}
