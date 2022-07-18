import { expect, assert } from "chai";
import { ethers, network, tenderly } from "hardhat";
import { stealMoney } from "../../../util/money";
import { showBody } from "../../../util/format";
import { BN } from "../../../util/number";
import { s } from "../scope";
import { d } from "../DeploymentInfo";
import { advanceBlockHeight, reset, mineBlock } from "../../../util/block";
import {
    AnchoredViewRelay,
    AnchoredViewRelay__factory,
    ChainlinkOracleRelay,
    ChainlinkOracleRelay__factory,
    CurveMaster,
    CurveMaster__factory,
    IERC20,
    IERC20__factory,
    IOracleRelay,
    OracleMaster,
    OracleMaster__factory,
    ProxyAdmin,
    ProxyAdmin__factory,
    TransparentUpgradeableProxy__factory,
    ThreeLines0_100,
    ThreeLines0_100__factory,
    UniswapV3OracleRelay__factory,
    USDI,
    USDI__factory,
    Vault,
    VaultController,
    VaultController__factory,
    IVaultController__factory,
    IVOTE,
    IVOTE__factory,
} from "../../../typechain-types";

require("chai").should();

// configurable variables
let usdc_minter = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";
let wbtc_minter = "0xf977814e90da44bfa03b6295a0616a897441acec"
let uni_minter = "0xf977814e90da44bfa03b6295a0616a897441acec"
let dydx_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let ens_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let aave_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let tribe_minter = "0xf977814e90da44bfa03b6295a0616a897441acec";
let weth_minter = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";


if (process.env.TENDERLY_KEY) {
    if (process.env.TENDERLY_ENABLE == "true") {
        let provider = new ethers.providers.Web3Provider(tenderly.network())
        ethers.provider = provider
    }
}

describe("hardhat settings", () => {
    it("Set hardhat network to a block after deployment", async () => {
        expect(await reset(15168448)).to.not.throw;
    });
    it("set automine OFF", async () => {
        expect(await network.provider.send("evm_setAutomine", [false])).to.not
            .throw;
    });
});

describe("Initial Setup", () => {
    it("connect to signers", async () => {
        s.accounts = await ethers.getSigners();
        s.Frank = s.accounts[0];
        s.Eric = s.accounts[5];
        s.Andy = s.accounts[6];
        s.Bob = s.accounts[7];
        s.Carol = s.accounts[8];
        s.Dave = s.accounts[9];
        s.Gus = s.accounts[10];
    });
    it("Connect to existing contracts", async () => {
        s.USDC = IERC20__factory.connect(s.usdcAddress, s.Frank);
        s.WETH = IERC20__factory.connect(s.wethAddress, s.Frank);
        s.UNI = IVOTE__factory.connect(s.uniAddress, s.Frank);
        s.WBTC = IERC20__factory.connect(s.wbtcAddress, s.Frank);
        s.COMP = IVOTE__factory.connect(s.compAddress, s.Frank);
        s.ENS = IVOTE__factory.connect(s.ensAddress, s.Frank);
        s.DYDX = IVOTE__factory.connect(s.dydxAddress, s.Frank);
        s.AAVE = IVOTE__factory.connect(s.aaveAddress, s.Frank);
        s.TRIBE = IVOTE__factory.connect(s.tribeAddress, s.Frank);

    });

    it("Connect to mainnet deployments for interest protocol", async () => {
        s.VaultController = VaultController__factory.connect(d.VaultController, s.Frank)
        s.USDI = USDI__factory.connect(d.USDI, s.Frank)
        s.Curve = CurveMaster__factory.connect(d.Curve, s.Frank)
        s.Oracle = OracleMaster__factory.connect(d.Oracle, s.Frank)

        s.ProxyAdmin = ProxyAdmin__factory.connect(d.ProxyAdmin, s.Frank)


    })
    it("Should succesfully transfer money", async () => {

        //showBody(`stealing ${s.Carol_UNI} to carol from ${s.uniAddress}`);
        await expect(
            stealMoney(uni_minter, s.Carol.address, s.uniAddress, s.Carol_UNI)
        ).to.not.be.reverted;
        //showBody(`stealing ${s.Gus_WBTC} to gus from ${s.wbtcAddress}`);
        await expect(
            stealMoney(wbtc_minter, s.Gus.address, s.wbtcAddress, s.Gus_WBTC)
        ).to.not.be.reverted;
        //showBody(`stealing ${s.Bob_WETH} weth to bob from ${s.wethAddress}`);
        await expect(
            stealMoney(weth_minter, s.Bob.address, s.wethAddress, s.Bob_WETH)
        ).to.not.be.reverted;


        //for some reason at this block, account 1 has 1 USDC, need to burn so all accounts are equal
        await s.USDC.connect(s.accounts[1]).transfer(usdc_minter, await s.USDC.balanceOf(s.accounts[1].address))
        await mineBlock()
        for (let i = 0; i < s.accounts.length; i++) {
            await expect(
                stealMoney(usdc_minter, s.accounts[i].address, s.USDC.address, s.BASE_USDC)
            ).to.not.be.reverted;
            await mineBlock()
            expect(await s.USDC.balanceOf(s.accounts[i].address)).to.eq(s.BASE_USDC, "USDC received")
        }
    });
});
