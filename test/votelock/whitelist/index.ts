import { expect, assert } from "chai";
import { ethers, network, tenderly } from "hardhat";
import { BN } from "../../../util/number";
import { s } from "../scope";
import { advanceBlockHeight, reset, mineBlock, fastForward } from "../../../util/block";
import { ICurveVoteEscrow, CurveVoterProxy, CrvDepositor, IERC20, AmphCrvToken, ICurveToken, ISmartWalletWhitelist } from "../../../typechain-types";
// import { ceaseImpersonation, impersonateAccount } from "../../../util/impersonator";
import { EtherscanProvider } from "@ethersproject/providers";
import { BigNumber } from "ethers";
import { monitorEventLoopDelay } from "perf_hooks";
import { createImmediatelyInvokedFunctionExpression } from "typescript";

//import { assert } from "console";

require("chai").should();

// configurable variables
let crvDepositor: CrvDepositor;
let crvVoterProxy: CurveVoterProxy;
let crv: ICurveToken;
let veCrv: ICurveVoteEscrow;
let amphCrv: AmphCrvToken;

describe("Setup", () => {
	it("connect to signers and send crv to users from crvWhale", async () => {
		s.accounts = await ethers.getSigners();
		s.Andy =  s.accounts[1];
		s.Bob =  s.accounts[2];
		s.Admin =  s.accounts[3];
    s.Treasury = s.accounts[4];
		s.Frank =  s.accounts[5];

    crv = await ethers.getContractAt("contracts/testing/CurveInterfaces.sol:ICurveToken", s.crvAddr) as ICurveToken;
    await network.provider.request({
      method: "hardhat_impersonateAccount", 
      params: [s.crvWhaleAddr],      
    }); 
    await mineBlock();
    s.CrvWhale = await ethers.getSigner(s.crvWhaleAddr);
    await mineBlock();
    const crvBal = (await crv.balanceOf(s.CrvWhale.address)).toString();

    const sendTx = await s.Frank.sendTransaction({to: s.CrvWhale.address, value: "100" + "000000000000000000"})
    await mineBlock();
    // const sendResult = await sendTx.wait();
    await mineBlock();
    const ethBal = (await s.CrvWhale.getBalance());
    const sent = await crv.connect(s.CrvWhale).transfer(s.Andy.address, "1000", {gasLimit: "300000"});
    await mineBlock();
    // const result = await sent.wait();
    const bal = await crv.balanceOf(s.Andy.address);
    expect(bal).to.equal(BN('1000'));
	}); 

	it("deploy contracts and approve spending of crv", async () => {
		// const VestingToken = await ethers.getContractFactory("VestingAmphora");
		// vestingToken = await VestingToken.connect(s.Gus).deploy();
		// await mineBlock();
		// await vestingToken.deployed();
		// expect(await vestingContract.owner()).to.equal(s.Gus.address);
    let CRVDepositor = await ethers.getContractFactory("CrvDepositor");
    let CRVVoterProxy = await ethers.getContractFactory("CurveVoterProxy");
    let AmphCRV = await ethers.getContractFactory("amphCrvToken");

    amphCrv = await AmphCRV.connect(s.Admin).deploy() as AmphCrvToken;
    await mineBlock();
    await amphCrv.deployed();

    crvVoterProxy = await CRVVoterProxy.connect(s.Admin).deploy() as CurveVoterProxy;
    await mineBlock();
    await crvVoterProxy.deployed();

    crvDepositor = await CRVDepositor.connect(s.Admin).deploy(crvVoterProxy.address, amphCrv.address) as CrvDepositor;
    await mineBlock();
    await crvDepositor.deployed();

    const opTx = await amphCrv.setOperator(crvDepositor.address)
    await mineBlock();
    // await opTx.wait();

    expect(await amphCrv.operator()).to.equal(crvDepositor.address);
    expect(await crvVoterProxy.owner()).to.equal(s.Admin.address);
    expect(await crvDepositor.feeManager()).to.equal(s.Admin.address);

    const depTx = await crvVoterProxy.connect(s.Admin).setDepositor(crvDepositor.address);
    await mineBlock();
    // await depTx.wait();

    const operatorTx = await crvVoterProxy.connect(s.Admin).setOperator(s.Admin.address);
    await mineBlock();
    // await operatorTx.wait();

    const treasuryTx = await crvVoterProxy.connect(s.Admin).setTreasury(s.Admin.address);
    await mineBlock();
    // await treasuryTx.wait();

    const feeTx = await crvDepositor.connect(s.Admin).setFees(0);
    await mineBlock();
    // await feeTx.wait();

    const approve1 = await crv.connect(s.Andy).approve(crvDepositor.address, ethers.constants.MaxUint256);
    await mineBlock();
    // await approve1.wait();
    const approve1_2 = await crv.connect(s.Andy).approve(crvVoterProxy.address, ethers.constants.MaxUint256);
    await mineBlock();
    // await approve1_2.wait();

	});
});

describe("Before Whitelist", () => {
	it("should not be whitelisted", async () => {
    expect(await crvVoterProxy.isWhitelisted()).to.equal(false);
  });

	it("CrvDepositor should hold crv in exchange for amphCrv", async () => {
    expect(await crv.balanceOf(s.Andy.address)).to.equal(BN('1000'));

    const depositTx = await crvDepositor.connect(s.Andy)["deposit(uint256,bool)"]('1000', true, {gasLimit: "300000"});
    await mineBlock();
    // await depositTx.wait();

    expect(await crv.balanceOf(crvVoterProxy.address)).to.equal(BN('1000'));
    expect(await amphCrv.balanceOf(s.Andy.address)).to.equal(BN('1000'));
	});

	it("should not be able to create lock", async () => {
    expect(crvDepositor.connect(s.Admin).initialLock()).to.be.revertedWith("!whitelisted");
  });
});

describe("After Whitelist", () => {
	it("should whitelist voter proxy (staker)", async () => {
    veCrv = await ethers.getContractAt("contracts/rewards/interfaces.sol:ICurveVoteEscrow", s.veCRVAddr) as ICurveVoteEscrow;
    const chkrAddr = await veCrv.smart_wallet_checker();
    const chkr = await ethers.getContractAt("contracts/testing/CurveInterfaces.sol:ISmartWalletWhitelist", chkrAddr) as ISmartWalletWhitelist;
    const daoAddr = (await chkr.dao()).toString();

    const sendTx = await s.Frank.sendTransaction({to: daoAddr, value: "10" + "000000000000000000"})
    await mineBlock();

    expect(parseInt((await ethers.provider.getBalance(daoAddr)).toString())).to.greaterThanOrEqual(10e18);

    await network.provider.request({
      method: "hardhat_impersonateAccount", 
      params: [daoAddr]
    }); 
    s.DaoWallet = await ethers.getSigner(daoAddr);
    await chkr.connect(s.DaoWallet).approveWallet(crvVoterProxy.address);

    expect(await crvVoterProxy.isWhitelisted()).to.equal(true);
  });

  it("should be able to create lock", async () => {
    expect(crvDepositor.connect(s.Admin).initialLock()).to.not.be.reverted;
    await mineBlock();
  });

  it("should be able to deposit and increase amount", async () => {
    await crv.connect(s.CrvWhale).transfer(s.Andy.address, "1000", {gasLimit: "300000"});
    const depositTx = await crvDepositor.connect(s.Andy)["deposit(uint256,bool)"]('1000', true, {gasLimit: "1000000"});
    expect(await crv.balanceOf(crvVoterProxy.address)).to.equal(BN('0'));
    expect(await amphCrv.balanceOf(s.Andy.address)).to.equal(BN('2000'));
  });
});
