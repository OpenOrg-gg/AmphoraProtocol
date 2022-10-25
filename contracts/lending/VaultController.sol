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
contract VaultController is Proxy, Initializable, PausableUpgradeable, ExponentialNoError, OwnableUpgradeable {
  using SafeERC20 for IERC20;

  struct Interest {
    uint64 lastTime;
    uint192 factor;
  }
  Interest public _interest;

  address public vaultControllerRewards;

  // mapping of vault id to vault address
  mapping(uint96 => address) public _vaultId_vaultAddress;

  //mapping of wallet address to vault IDs []
  mapping(address => uint96[]) public _wallet_vaultIDs;

  // mapping of token address to token info
  mapping(address => uint256) public _tokenAddress_tokenId;

  mapping(uint256 => TokenInfo) public _tokenId_tokenInfo;

  // when getting the live price of the underlying token of the wrapped token,
  // we need a mapping from the wrapped token address to the underlying token address
  mapping(address => address) public _wrappedTokenAddress_tokenAddress;

  address public lockIncentiveReciever;
  address public stakerIncentiveReciever;
  address public platformFeeReciever;

  address[] public _enabledTokens;

  //mappings of the enabled tokens for gas efficient single lookup
  mapping(address => bool) public _enabledTokenLookup;

  address public _treasury;
  address public _convex;
  uint256 public _feeBasis;

  uint256 public lockIncentive = 1000; //incentive to crv stakers //this is likely cvxCRV
  uint256 public stakerIncentive = 450; //incentive to native token stakers //what is native incentive?
  uint256 public earmarkIncentive = 50; //incentive to users who spend gas to make calls
  uint256 public platformFee = 0; //possible fee to build treasury
  uint256 public constant MaxFees = 2000;
  uint256 public constant FEE_DENOMINATOR = 10000;

  OracleMaster public _oracleMaster;
  CurveMaster public _curveMaster;

  IUSDA public _usda;
  uint96 public _vaultsMinted;

  uint256 public _tokensRegistered;
  uint256 public _lpTokensRegistered;
  uint192 public _totalBaseLiability;
  uint192 public _protocolFee;

  address public vaultControllerCoreLogic;
  address public vaultControllerSetter;

  /// @notice no initialization arguments.
  function initialize(
    address convex,
    address _vaultControllerRewards,
    address _vaultControllerCoreLogic,
    address _vaultControllerSetter
  ) external initializer {
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
      sig == IVaultController.checkVault.selector ||
      sig == IVaultController.pause.selector ||
      sig == IVaultController.unpause.selector ||
      sig == IVaultController.borrowUsdi.selector ||
      sig == IVaultController.borrowUSDAto.selector ||
      sig == IVaultController.borrowUSDCto.selector ||
      sig == IVaultController.repayUSDa.selector ||
      sig == IVaultController.repayAllUSDa.selector ||
      sig == IVaultController.liquidateVault.selector ||
      sig == IVaultController.tokensToLiquidate.selector ||
      sig == IVaultController.patchTBL.selector ||
      sig == IVaultController.amountToSolvency.selector ||
      sig == IVaultController.vaultLiability.selector ||
      sig == IVaultController.vaultBorrowingPower.selector ||
      sig == IVaultController.calculateInterest.selector ||
      sig == IVaultController.pay_interest.selector ||
      sig == IVaultController.vaultSummaries.selector
    ) {
      return vaultControllerCoreLogic;
    } else {
      return vaultControllerSetter;
    }
  }
}
