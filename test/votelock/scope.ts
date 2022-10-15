import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { 
  IERC20, 
  GovernorCharlieDelegate, 
  GovernorCharlieDelegator, 
  ProxyAdmin,
  IVaultController,
  ThreeLines0_100,
  ICurveMaster,
} from "../../typechain-types";
import {MainnetAddresses } from "../../util/addresser";
import { BN } from "../../util/number";

export class TestScope extends MainnetAddresses {

  crvAddr =           "0xD533a949740bb3306d119CC777fa900bA034cd52";
  cvxAddr =           "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b";
  cvxCrvAddr =        "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7";
  threeCrvWhaleAddr = "0x5d5d08393e5bC93078F83a6a0B9077b474B9bAD4";
  veCRVAddr =         "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2";
  vlCVXAddr =         "0x72a19342e8F1838460eBFCCEf09F6585e32db86E";
  crvWhaleAddr =      "0x7Bf94e5A07131442cb5474Ff6a702FbD30c097D5"; // crv whale on mainnet
  cvxWhaleAddr =      "0xf2c1b5561e8c81f8f59053a9bf9ac38b144034cf"; // cvx whale on mainnet
  cvxCrvWhaleAddr =   "0xeed5e94dbb57a413a2eb600db11f1cdca7add807"; // cvx whale on mainnet

  baseUSDC = BN("1000e6")

  Frank_USDC = BN("1e11");
  Bob_USDC = BN("40000000e6");
  Andy_USDC = BN("1000e6");
  Carol_USDC = BN("1000e6");
  Dave_USDC = BN("1000e6");
  Eric_USDC = BN("1000e6");

  Bank_USDC = BN("100e12")

  ProxyAdmin!: ProxyAdmin;
  VaultController!: IVaultController;

  ThreeLines!: ThreeLines0_100;

  GovernorCharlieDelegate!: GovernorCharlieDelegate;
  GovernorCharlieDelegator!: GovernorCharlieDelegator;

  GOV!: GovernorCharlieDelegate;

  accounts!: SignerWithAddress[]

  Frank!: SignerWithAddress;
  Andy!: SignerWithAddress; 
  Bob!: SignerWithAddress;
  Carol!: SignerWithAddress;
  Dave!: SignerWithAddress; 
  Eric!: SignerWithAddress; 

  Treasury!:SignerWithAddress; // treasury
  RewardSplitter!:SignerWithAddress; // treasury
  Admin!:SignerWithAddress; // admin of contracts in testing scope
  Bank!: SignerWithAddress; //holds a ton of USDC and is not on any whitelist
  CrvWhale!: SignerWithAddress; //Curve minter
  CvxWhale!: SignerWithAddress; //Curve minter
  CvxMultisig!: SignerWithAddress; //Curve minter
  CvxCrvWhale!: SignerWithAddress; //Curve minter
  ThreeCrvWhale!: SignerWithAddress;
  DaoWallet!: SignerWithAddress; //Curve minter
  

  constructor() {
    super();
  }
}
const ts = new TestScope();
export const s = ts;