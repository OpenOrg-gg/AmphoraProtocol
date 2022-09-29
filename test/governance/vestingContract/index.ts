import { expect, assert } from "chai";
import { ethers, network, tenderly } from "hardhat";
import { stealMoney } from "../../../util/money";
import { showBody } from "../../../util/format";
import { BN } from "../../../util/number";
import { s } from ".././scope";
import {advanceBlockHeight, reset, mineBlock, currentBlock} from "../../../util/block";
import { IERC20__factory, IVOTE__factory } from "../../../typechain-types";
import exp from "constants";
//import { assert } from "console";

require("chai").should();

// configurable variables
let vestingToken: any;
let redepmtionToken: any;
let vestingContract: any;

describe("hardhat settings", () => {
	it("reset hardhat network each run", async () => {
		expect(await reset(0)).to.not.throw;
	});
	it("set automine OFF", async () => {
		expect(await network.provider.send("evm_setAutomine", [false])).to.not
			.throw;
	});

});

describe("Setup", () => {
	it("connect to signers", async () => {
		s.accounts = await ethers.getSigners();
		s.Frank =  s.accounts[0];
		s.Andy =  s.accounts[1];
		s.Bob =  s.accounts[2];
		s.Carol =  s.accounts[3];
		s.Dave =  s.accounts[4];
		s.Eric =  s.accounts[5];
		s.Gus =  s.accounts[6];
		s.Hector =  s.accounts[7];
		s.Igor =  s.accounts[8];
		s.Bank = s.accounts[9];
	});

	it("deploy mocking tokens", async () => {
		const VestingToken = await ethers.getContractFactory("VestingAmphora");
		vestingToken = await VestingToken.connect(s.Gus).deploy();
		await mineBlock();
		await vestingToken.deployed();

		const RedeptionToken = await ethers.getContractFactory("VestingAmphora");
		redepmtionToken = await RedeptionToken.connect(s.Gus).deploy();
		await mineBlock();
		await redepmtionToken.deployed();

		const VestingContract = await ethers.getContractFactory("VestingRedemptionContract");
		vestingContract = await VestingContract.connect(s.Gus).deploy();
		await mineBlock();
		await vestingContract.deployed();

		const initializationTx = await vestingContract.connect(s.Gus).initialize(vestingToken.address, redepmtionToken.address);
		await mineBlock();
		await initializationTx.wait();

		// grant minter role
		const minterRole = await vestingToken.MINTER_ROLE();
		const grantVestingMinterTx = await vestingToken.connect(s.Gus).grantRole(minterRole, vestingContract.address);
		await mineBlock();
		await grantVestingMinterTx.wait();
		const grantRedemptionMinterTx = await redepmtionToken.connect(s.Gus).grantRole(minterRole, vestingContract.address);
		await mineBlock();
		await grantRedemptionMinterTx.wait();

		expect(await vestingContract.owner()).to.equal(s.Gus.address);
	});
});

describe("Redemption", () => {
	beforeEach(async () => {
		// mint vestingTokens to Dave
		const transferTx = await vestingToken.connect(s.Gus).mint(s.Dave.address, BN("1000e18"));
		await mineBlock();
		await transferTx.wait();

		// approve vestingContract to spend Dave's tokens
		const approveTx = await vestingToken.connect(s.Dave).approve(vestingContract.address, BN("1000e18"));
		await mineBlock();
		await approveTx.wait();

		expect(await vestingToken.balanceOf(s.Dave.address)).to.equal(BN("1000e18"));
	});

	it("should redeem 0.25 tokens when vesting duration is 0", async () => {
		const vestingTx = await vestingContract.connect(s.Dave).redeem(BN("1000e18"), BN("0"));
		await mineBlock();
		await vestingTx.wait();

		expect(await vestingToken.balanceOf(s.Dave.address)).to.equal(BN("0"));
		expect(await redepmtionToken.balanceOf(s.Dave.address)).to.equal(BN("250e18"));
	});

	it("should redeem 1.12 tokens when vesting duration is 4 years", async () => {
		const vestingTx = await vestingContract.connect(s.Dave).redeem(BN("1000e18"), BN("126230400"));
		await mineBlock();
		await vestingTx.wait();

		expect(await vestingToken.balanceOf(s.Dave.address)).to.equal(BN("0"));
		expect(await vestingContract.getTotalAllocation(s.Dave.address)).to.equal(BN("1120e18"));
	});
});

describe("Claim releasable redemption tokens", () => {
	it("should claim half of tokens after 2 years", async () => {
		const vestingStartTime = (await vestingContract.getVestingPosition(s.Dave.address, 0)).startTimestamp;
		await network.provider.send("evm_setNextBlockTimestamp", [Number(vestingStartTime.add(63115200).toString())]) // 126230400 / 2
		await mineBlock();

		expect(await redepmtionToken.balanceOf(vestingContract.address)).to.equal(BN("1120e18"));
		expect(await vestingContract.getTotalReleasable(s.Dave.address)).to.equal(BN("560e18"));
	});

	it("should be able to 75% half of tokens after 3 years", async () => {
		const vestingStartTime = (await vestingContract.getVestingPosition(s.Dave.address, 0)).startTimestamp;

		const releaseTx = await vestingContract.connect(s.Dave).releaseAll();
		await network.provider.send("evm_setNextBlockTimestamp", [Number(vestingStartTime.add(94672800).toString())]) // 126230400 * 3 / 4
		await mineBlock();
		await releaseTx.wait();

		expect(await redepmtionToken.balanceOf(vestingContract.address)).to.equal(BN("280e18"));
		expect(await redepmtionToken.balanceOf(s.Dave.address)).to.equal(BN("1090e18")); // 250 + 840
	});

	it("should be able to 100% half of tokens after 8 years (larger than 4 years)", async () => {
		const vestingStartTime = (await vestingContract.getVestingPosition(s.Dave.address, 0)).startTimestamp;

		const releaseTx = await vestingContract.connect(s.Dave).releaseAll();
		await network.provider.send("evm_setNextBlockTimestamp", [Number(vestingStartTime.add(252460800).toString())]) // 126230400 * 2
		await mineBlock();
		await releaseTx.wait();

		expect(await redepmtionToken.balanceOf(vestingContract.address)).to.equal(BN("0"));
		expect(await redepmtionToken.balanceOf(s.Dave.address)).to.equal(BN("1370e18")); // 250 + 1120
		expect(await vestingContract.getVestingPositionCount(s.Dave.address)).to.equal(BN("0"));
	});
});

describe("Multiple vesting streams", () => {
	beforeEach(async () => {
		// mint vestingTokens to Dave
		const transferTx = await vestingToken.connect(s.Gus).mint(s.Dave.address, BN("2000e18"));
		await mineBlock();
		await transferTx.wait();

		// approve vestingContract to spend Dave's tokens
		const approveTx = await vestingToken.connect(s.Dave).approve(vestingContract.address, BN("2000e18"));
		await mineBlock();
		await approveTx.wait();

		expect(await vestingToken.balanceOf(s.Dave.address)).to.equal(BN("2000e18"));

		// create 2 vesting streams
		const vestingTx1 = await vestingContract.connect(s.Dave).redeem(BN("1000e18"), BN("126230400"));
		await mineBlock();
		await vestingTx1.wait();
		expect(await vestingContract.getVestingPositionCount(s.Dave.address)).to.equal(BN("1"));
		expect(await redepmtionToken.balanceOf(vestingContract.address)).to.equal(BN("1120e18"));

		// start another vesting 2 years later
		const vestingStartTime = (await vestingContract.getVestingPosition(s.Dave.address, 0)).startTimestamp;
		const vestingTx2 = await vestingContract.connect(s.Dave).redeem(BN("1000e18"), BN("126230400"));
		await network.provider.send("evm_setNextBlockTimestamp", [Number(vestingStartTime.add(63115200).toString())]) // 126230400 * / 2
		await mineBlock();
		await vestingTx2.wait();
		expect(await vestingContract.getVestingPositionCount(s.Dave.address)).to.equal(BN("2"));
		expect(await redepmtionToken.balanceOf(vestingContract.address)).to.equal(BN("2240e18"));
	});

	it("should be able to claim 1120 + 560 tokens after another 2 years", async () => {
		const vestingStartTime = (await vestingContract.getVestingPosition(s.Dave.address, 0)).startTimestamp;

		const releaseTx = await vestingContract.connect(s.Dave).releaseAll();
		await network.provider.send("evm_setNextBlockTimestamp", [Number(vestingStartTime.add(126230400).toString())])
		await mineBlock();
		await releaseTx.wait();

		expect(await redepmtionToken.balanceOf(vestingContract.address)).to.equal(BN("560e18"));
		expect(await redepmtionToken.balanceOf(s.Dave.address)).to.equal(BN("3050e18")); // 250 + 1120 + 1120 + 560
		expect(await vestingContract.getVestingPositionCount(s.Dave.address)).to.equal(BN("1"));
	});
});

describe("Pausable", () => {
	before(async () => {
		// mint vestingTokens to Dave
		const transferTx = await vestingToken.connect(s.Gus).mint(s.Dave.address, BN("2000e18"));
		await mineBlock();
		await transferTx.wait();

		// approve vestingContract to spend Dave's tokens
		const approveTx = await vestingToken.connect(s.Dave).approve(vestingContract.address, BN("2000e18"));
		await mineBlock();
		await approveTx.wait();

		expect(await vestingToken.balanceOf(s.Dave.address)).to.equal(BN("2000e18"));
	});

	it("should not be able to redeem when paused", async () => {
		// pause the vesting contract
		const pauseTx = await vestingContract.connect(s.Gus).pause();
		await mineBlock();
		await pauseTx.wait();

		const redeemTx = await vestingContract.connect(s.Dave).redeem(BN("1000e18"), BN("0"));
		await mineBlock();
		await expect(redeemTx.wait()).to.be.reverted;
	});

	it("should be able to redeem when not paused", async () => {
		// pause the vesting contract
		const pauseTx = await vestingContract.connect(s.Gus).unpause();
		await mineBlock();
		await pauseTx.wait();

		const redeemTx = await vestingContract.connect(s.Dave).redeem(BN("1000e18"), BN("0"));
		await mineBlock();
		await expect(redeemTx.wait()).to.not.be.reverted;
	});
});
