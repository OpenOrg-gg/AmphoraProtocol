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
  USDC!: IERC20;

  usdc_minter = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";
  crvAddr = "0xD533a949740bb3306d119CC777fa900bA034cd52";
  veCRVAddr = "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2";
  crvWhaleAddr = "0x7Bf94e5A07131442cb5474Ff6a702FbD30c097D5"; // crv whale on mainnet

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
  Admin!:SignerWithAddress; // admin of contracts in testing scope
  Bank!: SignerWithAddress; //holds a ton of USDC and is not on any whitelist
  CrvWhale!: SignerWithAddress; //Curve minter
  DaoWallet!: SignerWithAddress; //Curve minter
  

  constructor() {
    super();
  }
}
const ts = new TestScope();
export const s = ts;