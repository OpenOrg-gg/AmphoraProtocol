import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import fs from "fs";
import {
  USDA,
  IERC20,
  IVOTE,
  VaultController,
  OracleMaster,
  AnchoredViewRelay,
  ChainlinkOracleRelay,
  IOracleRelay,
  CurveMaster,
  ThreeLines0_100,
  IVault,
  IOracleMaster,
  IVaultController,
  ProxyAdmin,
  IUSDA,
  ICurveMaster,
  ProxyAdmin__factory,
  VaultController__factory,
  OracleMaster__factory,
  AnchoredViewRelay__factory,
  CurveMaster__factory,
  TransparentUpgradeableProxy__factory,
  USDA__factory,
  IERC20__factory,
  IVOTE__factory,
  ThreeLines0_100__factory,
  UniswapV3OracleRelay__factory,
  IOracleRelay__factory,
  ChainlinkOracleRelay__factory,
  ERC20Detailed__factory,
  TESTERC20__factory,
  InterestProtocolTokenDelegate__factory,
  InterestProtocolTokenDelegate,
  InterestProtocolToken__factory,
  GovernorCharlieDelegate__factory,
  GovernorCharlieDelegator__factory,
  GovernorCharlieDelegator,
  GovernorCharlieDelegate,
  InterestProtocolToken,
} from "../../typechain-types";
import { Addresser, MainnetAddresses } from "../../util/addresser";
import { BN } from "../../util/number";

export interface DeploymentInfo {
  USDC?: string;
  UNI?: string;
  WBTC?: string;
  WETH?: string;
  USDC_ETH_CL?: string;
  USDC_UNI_CL?: string;
  USDC_WBTC_CL?: string;
  USDC_AAVE_CL?: string;
  USDC_CRV_CL?: string;
  USDC_DAI_CL?: string;
  USDC_DYDX_CL?: string;
  USDC_FXS_CL?: string;
  USDC_OP_CL?: string;
  USDC_PERP_CL?: string;
  USDC_SNX_CL?: string;
  USDC_USDC_CL?: string;
  USDC_USDT_CL?: string;
  USDC_ETH_POOL?: string;
  USDC_UNI_POOL?: string;
  USDC_WBTC_POOL?: string;
  USDC_AAVE_POOL?: string;
  USDC_CRV_POOL?: string;
  USDC_DAI_POOL?: string;
  USDC_DYDX_POOL?: string;
  USDC_FXS_POOL?: string;
  USDC_LINK_POOL?: string;
  USDC_OP_POOL?: string;
  USDC_PERP_POOL?: string;
  USDC_SNX_POOL?: string;
  USDC_USDT_POOL?: string;
  USDC_USDC_POOL?: string;
  USDA?: string;
  ProxyAdmin?: string;
  VaultController?: string;
  Oracle?: string;
  EthOracle?: string;
  UniOracle?: string;
  WBTCOracle?: string;
  AAVEOracle?: string;
  CRVOracle?: string;
  DAIOracle?: string;
  DYDXOracle?: string;
  FXSOracle?: string;
  LINKOracle?: string;
  OPOracle?: string;
  PERPOracle?: string;
  SNXOracle?: string;
  USDTOracle?: string;
  USDCOracle?: string;
  Curve?: string;
  ThreeLines?: string;

  IPTDelegate?: string;
  IPTDelegator?: string;

  CharlieDelegate?: string;
  CharlieDelegator?: string;
}

export class Deployment {
  USDA!: USDA;
  SUSD!: IERC20;
  USDC!: IERC20;
  USDT!: IERC20;
  AAVE!: IERC20;
  CRV!: IERC20;
  DAI!: IERC20;
  DYDX!: IERC20;
  FXS!: IERC20;
  LINK!: IERC20;
  OP!: IERC20;
  PERP!: IERC20;
  SNX!: IERC20;
  UNI!: IVOTE;
  WETH!: IERC20;
  WBTC!: IERC20;

  ProxyAdmin!: ProxyAdmin;
  VaultController!: VaultController;

  Oracle!: OracleMaster;

  EthOracle!: IOracleRelay;
  UniOracle!: IOracleRelay;
  WBTCOracle!: IOracleRelay;
  AAVEOracle!: IOracleRelay;
  CRVOracle!: IOracleRelay;
  DAIOracle!: IOracleRelay;
  DYDXOracle!: IOracleRelay;
  FXSOracle!: IOracleRelay;
  LINKOracle!: IOracleRelay;
  OPOracle!: IOracleRelay;
  PERPOracle!: IOracleRelay;
  SNXOracle!: IOracleRelay;
  USDTOracle!: IOracleRelay;
  USDCOracle!: IOracleRelay;

  Curve!: CurveMaster;
  ThreeLines!: ThreeLines0_100;

  Info: DeploymentInfo;

  IPTDelegate!: InterestProtocolTokenDelegate;
  IPTDelegator!: InterestProtocolToken;

  CharlieDelegator!: GovernorCharlieDelegator;
  CharlieDelegate!: GovernorCharlieDelegate;

  deployer: SignerWithAddress;

  constructor(deployer: SignerWithAddress, i: DeploymentInfo) {
    this.Info = i;
    this.deployer = deployer;
  }

  async ensure() {
    await this.ensureExternal();
    await this.ensureProxyAdmin();
    await this.ensureVaultController();
    await this.ensureUSDA();
    await this.ensureCurve();
    await this.ensureOracle();
    await this.ensureEthOracle();
    //await this.ensureUniOracle();
    await this.ensureWBTCOracle();
    //await this.ensureAAVEOracle();
    await this.ensureCRVOracle();
    await this.ensureDAIOracle();
    //await this.ensureDYDXOracle();
    //await this.ensureFXSOracle();
    //await this.ensureLINKOracle();
    await this.ensureOPOracle();
    //await this.ensurePERPOracle();
    await this.ensureSNXOracle();
    await this.ensureUSDTOracle();
    await this.ensureUSDCOracle();
    console.log(this.Info);
    await this.ensureCharlie();
  }
  async ensureExternal() {
    if (this.Info.USDC) {
      this.USDC = IERC20__factory.connect(this.Info.USDC!, this.deployer);
    } else {
      console.log("deploying usdc");
      this.USDC = await new TESTERC20__factory(this.deployer).deploy(
        "USD Coin",
        "USDC",
        6,
        20000
      );
      await this.USDC.deployed();
      this.Info.USDC = this.USDC.address;
      console.log("USDC deployed at:", this.USDC.address);
    }
    if (this.Info.WETH) {
      this.WETH = IERC20__factory.connect(this.Info.WETH!, this.deployer);
    } else {
      console.log("deploying eth");
      this.WETH = await new TESTERC20__factory(this.deployer).deploy(
        "Wrapped Ether",
        "WETH",
        18,
        2
      );
      await this.WETH.deployed();
      this.Info.WETH = this.WETH.address;
      console.log("WETH deployed at:", this.WETH.address);
    }
    if (this.Info.WBTC) {
      this.WBTC = IERC20__factory.connect(this.Info.WBTC!, this.deployer);
    } else {
      console.log("deploying wbtc");
      this.WBTC = (await new TESTERC20__factory(this.deployer).deploy(
        "Wrapped Bitcoin",
        "WBTC",
        8,
        1
      )) as any;
      await this.WBTC.deployed();
      this.Info.WBTC = this.WBTC.address;
      console.log("WBTC deployed at:", this.WBTC.address);
    }
    if (this.Info.UNI) {
      this.UNI = IVOTE__factory.connect(this.Info.UNI!, this.deployer);
    } else {
      console.log("deploying uni");
      this.UNI = (await new TESTERC20__factory(this.deployer).deploy(
        "Uniswap Token",
        "UNI",
        18,
        500
      )) as any;
      console.log("UNI deployed at:", this.UNI.address);
      this.Info.UNI = this.UNI.address;
      await this.UNI.deployed();
    }
  }

  async ensureProxyAdmin() {
    if (this.Info.ProxyAdmin != undefined) {
      this.ProxyAdmin = new ProxyAdmin__factory(this.deployer).attach(
        this.Info.ProxyAdmin
      );
      console.log(`found ProxyAdmin at ${this.Info.ProxyAdmin}`);
    } else {
      this.ProxyAdmin = await new ProxyAdmin__factory(this.deployer).deploy();
      await this.ProxyAdmin.deployed();
      this.Info.ProxyAdmin = this.ProxyAdmin.address;
      console.log("proxyAdmin address: ", this.ProxyAdmin.address);
    }
  }
  async ensureVaultController() {
    if (this.Info.VaultController != undefined) {
      this.VaultController = new VaultController__factory(this.deployer).attach(
        this.Info.VaultController
      );
      console.log(`found VaultController at ${this.Info.VaultController}`);
    } else {
      const VaultControllerFactory = new VaultController__factory(
        this.deployer
      );
      const uVC = await VaultControllerFactory.deploy();
      await uVC.deployed();
      console.log("VaultController implementation address: ", uVC.address);
      const VaultController = await new TransparentUpgradeableProxy__factory(
        this.deployer
      ).deploy(uVC.address, this.ProxyAdmin.address, "0x");
      await VaultController.deployed();
      console.log("VaultController proxy address: ", VaultController.address);
      this.VaultController = VaultControllerFactory.attach(
        VaultController.address
      );
      const txn = await this.VaultController.initialize();
      await txn.wait();
      console.log(
        "VaultController initialized: ",
        this.VaultController.address
      );
      this.Info.VaultController = this.VaultController.address;
    }
  }
  async ensureOracle() {
    if (this.Info.Oracle != undefined) {
      this.Oracle = new OracleMaster__factory(this.deployer).attach(
        this.Info.Oracle
      );
      console.log(`found OracleMaster at ${this.Info.Oracle}`);
    } else {
      this.Oracle = await new OracleMaster__factory(this.deployer).deploy();
      await this.Oracle.deployed();
      this.Info.Oracle = this.Oracle.address;
      console.log("oracleMaster deployed: ", this.Oracle.address);
    }
    if ((await this.VaultController.getOracleMaster()) != this.Oracle.address) {
      console.log("Registering oracle master");
      await (
        await this.VaultController.registerOracleMaster(this.Oracle.address)
      ).wait();
      console.log("Registered oracle master");
    }
  }

  async ensureEthOracle() {
    if (this.Info.EthOracle != undefined) {
      this.EthOracle = IOracleRelay__factory.connect(
        this.Info.EthOracle,
        this.deployer
      );
      console.log(`found EthOracle at ${this.Info.EthOracle}`);
    } else {
      console.log("deplying new eth oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_ETH_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 2, //lookback
          this.Info.USDC_ETH_POOL, //pool_address
          true, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (this.Info.USDC_ETH_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_ETH_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (cl && pool) {
        this.EthOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 20, 100);
        await this.EthOracle.deployed();
      } else {
        this.EthOracle = cl ? cl : pool!;
      }
      this.Info.EthOracle = this.EthOracle.address;
    }
    if (
      (await this.Oracle._relays(this.WETH.address)) != this.EthOracle.address
    ) {
      console.log("setting eth oracle to be eth relay");
      let r2 = await this.Oracle.setRelay(
        this.WETH.address,
        this.EthOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.WETH.address)).eq(
        0
      )
    ) {
      console.log("registering eth into vault controller");
      let t = await this.VaultController.registerErc20(
        this.WETH.address,
        BN("80e16"),
        this.WETH.address,
        BN("10e16")
      );
      await t.wait();
    }
  }

  async ensureWBTCOracle() {
    if (this.Info.WBTCOracle != undefined) {
      this.WBTCOracle = IOracleRelay__factory.connect(
        this.Info.WBTCOracle,
        this.deployer
      );
      console.log(`found WBTCOracle at ${this.Info.WBTCOracle}`);
    } else {
      console.log("deplying new wbtc oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_WBTC_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_WBTC_CL, //pool_address
          BN("1e20"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_WBTC_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 2, //lookback
          this.Info.USDC_WBTC_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.WBTCOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 20, 100);
      } else {
        this.WBTCOracle = cl ? cl : pool!;
      }
      await this.WBTCOracle.deployed();
      this.Info.WBTCOracle = this.WBTCOracle.address;
    }
    if (
      (await this.Oracle._relays(this.WBTC.address)) != this.WBTCOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.WBTC.address,
        this.WBTCOracle.address
      );
      await r2.wait();
    }
    const tokenid = await this.VaultController._tokenAddress_tokenId(
      this.WBTC.address
    );
    if (tokenid.eq(0)) {
      let t = await this.VaultController.registerErc20(
        this.WBTC.address,
        BN("8e17"),
        this.WBTC.address,
        BN("5e16")
      );
      await t.wait();
    }
  }

  async ensureUniOracle() {
    if (this.Info.UniOracle != undefined) {
      this.UniOracle = IOracleRelay__factory.connect(
        this.Info.UniOracle,
        this.deployer
      );
      console.log(`found UniOracle at ${this.Info.UniOracle}`);
    } else {
      console.log("deploying new uni oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_UNI_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_UNI_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_UNI_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_UNI_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.UniOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.UniOracle = cl ? cl : pool!;
      }
      await this.UniOracle.deployed();
      this.Info.UniOracle = this.UniOracle.address;
    }
    if (
      (await this.Oracle._relays(this.UNI.address)) != this.UniOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.UNI.address,
        this.UniOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.UNI.address)).eq(0)
    ) {
      console.log("registering uni into vault controller");
      let t = await this.VaultController.registerErc20(
        this.UNI.address,
        BN("55e16"),
        this.UNI.address,
        BN("15e16")
      );
      await t.wait();
    }
  }

  async ensureAAVEOracle() {
    if (this.Info.AAVEOracle != undefined) {
      this.AAVEOracle = IOracleRelay__factory.connect(
        this.Info.AAVEOracle,
        this.deployer
      );
      console.log(`found AAVEOracle at ${this.Info.AAVEOracle}`);
    } else {
      console.log("deploying new AAVE oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_AAVE_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_AAVE_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_AAVE_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_AAVE_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.AAVEOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.AAVEOracle = cl ? cl : pool!;
      }
      await this.AAVEOracle.deployed();
      this.Info.AAVEOracle = this.AAVEOracle.address;
    }
    if (
      (await this.Oracle._relays(this.AAVE.address)) != this.AAVEOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.AAVE.address,
        this.AAVEOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.AAVE.address)).eq(0)
    ) {
      console.log("registering AAVE into vault controller");
      let t = await this.VaultController.registerErc20(
        this.AAVE.address,
        BN("25e16"),
        this.AAVE.address,
        BN("15e16")
      );
      await t.wait();
    }
  }

  async ensureCRVOracle() {
    if (this.Info.CRVOracle != undefined) {
      this.CRVOracle = IOracleRelay__factory.connect(
        this.Info.CRVOracle,
        this.deployer
      );
      console.log(`found CRVOracle at ${this.Info.CRVOracle}`);
    } else {
      console.log("deploying new CRV oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_CRV_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_CRV_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_CRV_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_CRV_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.CRVOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.CRVOracle = cl ? cl : pool!;
      }
      await this.CRVOracle.deployed();
      this.Info.CRVOracle = this.CRVOracle.address;
    }
    if (
      (await this.Oracle._relays(this.CRV.address)) != this.CRVOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.CRV.address,
        this.CRVOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.CRV.address)).eq(0)
    ) {
      console.log("registering CRV into vault controller");
      let t = await this.VaultController.registerErc20(
        this.CRV.address,
        BN("55e16"),
        this.CRV.address,
        BN("15e16")
      );
      await t.wait();
    }
  }

  async ensureDAIOracle() {
    if (this.Info.DAIOracle != undefined) {
      this.DAIOracle = IOracleRelay__factory.connect(
        this.Info.DAIOracle,
        this.deployer
      );
      console.log(`found DAIOracle at ${this.Info.DAIOracle}`);
    } else {
      console.log("deploying new DAI oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_DAI_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_DAI_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_DAI_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_DAI_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.DAIOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.DAIOracle = cl ? cl : pool!;
      }
      await this.DAIOracle.deployed();
      this.Info.DAIOracle = this.DAIOracle.address;
    }
    if (
      (await this.Oracle._relays(this.DAI.address)) != this.DAIOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.DAI.address,
        this.DAIOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.DAI.address)).eq(0)
    ) {
      console.log("registering DAI into vault controller");
      let t = await this.VaultController.registerErc20(
        this.DAI.address,
        BN("77e16"),
        this.DAI.address,
        BN("10e16")
      );
      await t.wait();
    }
  }

  async ensureDYDXOracle() {
    if (this.Info.DYDXOracle != undefined) {
      this.DYDXOracle = IOracleRelay__factory.connect(
        this.Info.DYDXOracle,
        this.deployer
      );
      console.log(`found DYDXOracle at ${this.Info.DYDXOracle}`);
    } else {
      console.log("deploying new DYDX oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_DYDX_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_DYDX_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_DYDX_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_DYDX_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.DYDXOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.DYDXOracle = cl ? cl : pool!;
      }
      await this.DYDXOracle.deployed();
      this.Info.DYDXOracle = this.DYDXOracle.address;
    }
    if (
      (await this.Oracle._relays(this.DYDX.address)) != this.DYDXOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.DYDX.address,
        this.DYDXOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.DYDX.address)).eq(0)
    ) {
      console.log("registering DYDX into vault controller");
      let t = await this.VaultController.registerErc20(
        this.DYDX.address,
        BN("25e16"),
        this.DYDX.address,
        BN("15e16")
      );
      await t.wait();
    }
  }

  async ensureFXSOracle() {
    if (this.Info.FXSOracle != undefined) {
      this.FXSOracle = IOracleRelay__factory.connect(
        this.Info.FXSOracle,
        this.deployer
      );
      console.log(`found FXSOracle at ${this.Info.FXSOracle}`);
    } else {
      console.log("deploying new FXS oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_FXS_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_FXS_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_FXS_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_FXS_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.FXSOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.FXSOracle = cl ? cl : pool!;
      }
      await this.FXSOracle.deployed();
      this.Info.FXSOracle = this.FXSOracle.address;
    }
    if (
      (await this.Oracle._relays(this.FXS.address)) != this.FXSOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.FXS.address,
        this.FXSOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.FXS.address)).eq(0)
    ) {
      console.log("registering FXS into vault controller");
      let t = await this.VaultController.registerErc20(
        this.FXS.address,
        BN("10e16"),
        this.FXS.address,
        BN("10e16")
      );
      await t.wait();
    }
  }

  async ensureOPOracle() {
    if (this.Info.OPOracle != undefined) {
      this.OPOracle = IOracleRelay__factory.connect(
        this.Info.OPOracle,
        this.deployer
      );
      console.log(`found OPOracle at ${this.Info.OPOracle}`);
    } else {
      console.log("deploying new OP oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_OP_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_OP_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_OP_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_OP_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.OPOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.OPOracle = cl ? cl : pool!;
      }
      await this.OPOracle.deployed();
      this.Info.OPOracle = this.OPOracle.address;
    }
    if (
      (await this.Oracle._relays(this.OP.address)) != this.OPOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.OP.address,
        this.OPOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.OP.address)).eq(0)
    ) {
      console.log("registering OP into vault controller");
      let t = await this.VaultController.registerErc20(
        this.OP.address,
        BN("15e16"),
        this.OP.address,
        BN("12e16")
      );
      await t.wait();
    }
  }

  async ensurePERPOracle() {
    if (this.Info.PERPOracle != undefined) {
      this.PERPOracle = IOracleRelay__factory.connect(
        this.Info.PERPOracle,
        this.deployer
      );
      console.log(`found PERPOracle at ${this.Info.PERPOracle}`);
    } else {
      console.log("deploying new PERP oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_PERP_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_PERP_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_PERP_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_PERP_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.PERPOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.PERPOracle = cl ? cl : pool!;
      }
      await this.PERPOracle.deployed();
      this.Info.PERPOracle = this.PERPOracle.address;
    }
    if (
      (await this.Oracle._relays(this.PERP.address)) != this.PERPOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.PERP.address,
        this.PERPOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.PERP.address)).eq(0)
    ) {
      console.log("registering PERP into vault controller");
      let t = await this.VaultController.registerErc20(
        this.PERP.address,
        BN("10e16"),
        this.PERP.address,
        BN("10e16")
      );
      await t.wait();
    }
  }

  async ensureSNXOracle() {
    if (this.Info.SNXOracle != undefined) {
      this.SNXOracle = IOracleRelay__factory.connect(
        this.Info.SNXOracle,
        this.deployer
      );
      console.log(`found SNXOracle at ${this.Info.SNXOracle}`);
    } else {
      console.log("deploying new SNX oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_SNX_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_SNX_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_SNX_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_SNX_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.SNXOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.SNXOracle = cl ? cl : pool!;
      }
      await this.SNXOracle.deployed();
      this.Info.SNXOracle = this.SNXOracle.address;
    }
    if (
      (await this.Oracle._relays(this.SNX.address)) != this.SNXOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.SNX.address,
        this.SNXOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.SNX.address)).eq(0)
    ) {
      console.log("registering SNX into vault controller");
      let t = await this.VaultController.registerErc20(
        this.SNX.address,
        BN("33e16"),
        this.SNX.address,
        BN("18e16")
      );
      await t.wait();
    }
  }

  async ensureUSDTOracle() {
    if (this.Info.USDTOracle != undefined) {
      this.USDTOracle = IOracleRelay__factory.connect(
        this.Info.USDTOracle,
        this.deployer
      );
      console.log(`found USDTOracle at ${this.Info.USDTOracle}`);
    } else {
      console.log("deploying new USDT oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_USDT_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_USDT_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_USDT_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_USDT_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e20"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.USDTOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.USDTOracle = cl ? cl : pool!;
      }
      await this.USDTOracle.deployed();
      this.Info.USDTOracle = this.USDTOracle.address;
    }
    if (
      (await this.Oracle._relays(this.USDT.address)) != this.USDTOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.USDT.address,
        this.USDTOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.USDT.address)).eq(0)
    ) {
      console.log("registering USDT into vault controller");
      let t = await this.VaultController.registerErc20(
        this.USDT.address,
        BN("70e16"),
        this.USDT.address,
        BN("25e16")
      );
      await t.wait();
    }
  }

  async ensureUSDCOracle() {
    if (this.Info.USDCOracle != undefined) {
      this.USDCOracle = IOracleRelay__factory.connect(
        this.Info.USDCOracle,
        this.deployer
      );
      console.log(`found USDCOracle at ${this.Info.USDCOracle}`);
    } else {
      console.log("deploying new USDC oracle");
      let cl = undefined;
      let pool = undefined;
      if (this.Info.USDC_USDC_CL) {
        cl = await new ChainlinkOracleRelay__factory(this.deployer).deploy(
          this.Info.USDC_USDC_CL, //pool_address
          BN("1e10"), //mul
          BN("1") //div
        );
        await cl.deployed();
      }
      if (this.Info.USDC_USDC_POOL) {
        pool = await new UniswapV3OracleRelay__factory(this.deployer).deploy(
          60 * 60 * 4,
          this.Info.USDC_USDC_POOL, //pool_address
          false, //quote_token_is_token0
          BN("1e12"), //mul
          BN("1") //div
        );
        await pool.deployed();
      }
      if (cl && pool) {
        await cl.deployed();
        await pool.deployed();
        this.USDCOracle = await new AnchoredViewRelay__factory(
          this.deployer
        ).deploy(cl.address, cl.address, 40, 100);
      } else {
        this.USDCOracle = cl ? cl : pool!;
      }
      await this.USDCOracle.deployed();
      this.Info.USDCOracle = this.USDCOracle.address;
    }
    if (
      (await this.Oracle._relays(this.USDC.address)) != this.USDCOracle.address
    ) {
      let r2 = await this.Oracle.setRelay(
        this.USDC.address,
        this.USDCOracle.address
      );
      await r2.wait();
    }
    if (
      (await this.VaultController._tokenAddress_tokenId(this.USDC.address)).eq(0)
    ) {
      console.log("registering USDC into vault controller");
      let t = await this.VaultController.registerErc20(
        this.USDC.address,
        BN("80e16"),
        this.USDC.address,
        BN("10e16")
      );
      await t.wait();
    }
  }

  async ensureUSDA() {
    if (this.Info.USDA != undefined) {
      this.USDA = new USDA__factory(this.deployer).attach(this.Info.USDA);
      console.log(`found USDA at ${this.Info.USDA}`);
    } else {
      const uUSDA = await new USDA__factory(this.deployer).deploy();
      await uUSDA.deployed();
      console.log("USDA implementation address: ", uUSDA.address);
      //USDA proxy
      const USDA = await new TransparentUpgradeableProxy__factory(
        this.deployer
      ).deploy(uUSDA.address, this.ProxyAdmin.address, "0x");
      await USDA.deployed();
      console.log("USDA proxy address: ", USDA.address);
      //attach
      this.USDA = new USDA__factory(this.deployer).attach(USDA.address);
      let t = await this.USDA.initialize(this.USDC.address);
      await t.wait();
      console.log("USDA initialized: ", this.USDA.address);
      this.Info.USDA = this.USDA.address;
    }
    if (
      (await this.USDA.connect(this.deployer).getVaultController()) !=
      this.VaultController.address
    ) {
      let t = await this.USDA.connect(this.deployer).setVaultController(
        this.VaultController.address
      );
      await t.wait();
      console.log(
        "Set VaultController on USDA to: ",
        this.VaultController.address
      );
    }
    if (
      (await this.VaultController.connect(this.deployer)._usda()) !=
      this.USDA.address
    ) {
      {
        let t = await this.VaultController.connect(this.deployer).registerUSDa(
          this.USDA.address
        );
        await t.wait();
      }
      console.log("Set USDA on VaultController to: ", this.USDA.address);
    }
  }
  async ensureCurve() {
    if (this.Info.Curve != undefined) {
      this.Curve = new CurveMaster__factory(this.deployer).attach(
        this.Info.Curve
      );
      console.log(`found CurveMaster at ${this.Info.Curve}`);
    } else {
      const curveFactory = new CurveMaster__factory().connect(this.deployer);
      this.Curve = await curveFactory.deploy();
      await this.Curve.deployed();
      this.Info.Curve = this.Curve.address;
      console.log("deployed curve master at", this.Info.Curve);
    }
    if (
      (await this.Curve._vaultControllerAddress()) !=
      this.VaultController.address
    ) {
      console.log("setting Curve vault controller");
      await (
        await this.Curve.setVaultController(this.VaultController.address)
      ).wait();
    }
    if (this.Info.ThreeLines != undefined) {
      this.ThreeLines = new ThreeLines0_100__factory(this.deployer).attach(
        this.Info.ThreeLines
      );
      console.log(`found ThreeLines at ${this.Info.ThreeLines}`);
    } else {
      console.log("deploying three lines");
      this.ThreeLines = await new ThreeLines0_100__factory(
        this.deployer
      ).deploy(
        BN("600e16"), //r1
        BN("10e16"), //r2
        BN("5e15"), //r3
        BN("40e16"), //s1
        BN("60e16") //s2
      );
      await this.ThreeLines.deployed();
      this.Info.ThreeLines = this.ThreeLines.address;
      console.log("deployed three lines at", this.Info.ThreeLines);
    }
    if (
      (await this.Curve._curves(
        "0x0000000000000000000000000000000000000000"
      )) != this.ThreeLines.address
    ) {
      console.log("setting 0 curve to threelines");
      let t = await this.Curve.forceSetCurve(
        "0x0000000000000000000000000000000000000000",
        this.ThreeLines.address
      );
      await t.wait();
    }
    if ((await this.VaultController.getCurveMaster()) != this.Curve.address) {
      console.log("setting curve master of vault controller");
      let t = await this.VaultController.registerCurveMaster(
        this.Curve.address
      );
      await t.wait();
    }
  }

  async ensureCharlie() {
    if (this.Info.CharlieDelegator) {
      console.log("found charlie at", this.Info.CharlieDelegator);
      this.IPTDelegator = new InterestProtocolToken__factory(
        this.deployer
      ).attach(this.Info.IPTDelegator!);
    } else {
      console.log("Deploying governance stack");
      this.IPTDelegate = await new InterestProtocolTokenDelegate__factory(
        this.deployer
      ).deploy();
      await this.IPTDelegate.deployed();
      console.log(
        "InterestProtocolTokenDelegate deployed: ",
        this.IPTDelegate.address
      );
      const totalSupply_ = BN("1e26");
      console.log("Deploying GovernorCharlieDelegate...");
      this.CharlieDelegate = await new GovernorCharlieDelegate__factory(
        this.deployer
      ).deploy();
      await this.CharlieDelegate.deployed();

      this.IPTDelegator = await new InterestProtocolToken__factory(
        this.deployer
      ).deploy(
        this.deployer.address,
        this.deployer.address,
        this.IPTDelegate.address,
        totalSupply_
      );
      await this.IPTDelegator.deployed();
      console.log("IPTDelegator deployed: ", this.IPTDelegator.address);
      console.log("Deploying GovernorCharlieDelegator...");
      const votingDelay_ = BN("13140");
      const votingPeriod_ = BN("40320");
      const proposalTimelockDelay_ = BN("172800");
      const proposalThreshold_ = BN("1000000e18");
      const quorumVotes_ = BN("10000000e18");
      const emergencyVotingPeriod_ = BN("6570");
      const emergencyTimelockDelay_ = BN("43200");
      const emergencyQuorumVotes_ = BN("40000000e18");
      this.CharlieDelegator = await new GovernorCharlieDelegator__factory(
        this.deployer
      ).deploy(
        this.IPTDelegator.address,
        this.CharlieDelegate.address
      );
      await this.CharlieDelegator.deployed();
      console.log(
        "Charlie Delegator Deployed: ",
        this.CharlieDelegator.address
      );

      this.Info.CharlieDelegator = this.CharlieDelegator.address;
      this.Info.CharlieDelegate = this.CharlieDelegate.address;
      this.Info.IPTDelegator = this.IPTDelegator.address;
      this.Info.IPTDelegate = this.IPTDelegate.address;
    }
  }
}
