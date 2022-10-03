import { expect, assert } from "chai";
import { ethers, network, tenderly } from "hardhat";
import { BN } from "../../../util/number";
import { s } from "../scope";
import { 
  ILockedCvx, 
  ConvexVoterProxy, 
  CvxDepositor, 
  AmphCvxToken, 
  ICurveToken, 
  IFeeDistro,
  IDelegation,
} from "../../../typechain-types";
import { IERC20 } from "../../../typechain-types/_external";
import { fastForward, mineBlock, OneWeek } from "../../../util/block";
// import { ceaseImpersonation, impersonateAccount } from "../../../util/impersonator";

//import { assert } from "console";

require("chai").should();

function web3StringToBytes32(text: string) {
  var result = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(text));
  while (result.length < 66) { result += '0'; }
  if (result.length !== 66) { throw new Error("invalid web3 implicit bytes32"); }
  return result;
}

// configurable variables
let cvxDepositor: CvxDepositor;
let cvxVoterProxy: ConvexVoterProxy;
let crv: ICurveToken;
let cvx: IERC20;
let cvxCrv: IERC20;
let vlCvx: ILockedCvx;
let amphCvx: AmphCvxToken;
let feeDistro: IFeeDistro; // [TODO]: Remove this ??

describe("Setup", () => {
	it("connect to signers and send cvx to users from cvxWhale", async () => {
		s.accounts = await ethers.getSigners();
		s.Andy =  s.accounts[1];
		s.Bob =  s.accounts[2];
		s.Admin =  s.accounts[3];
    s.Treasury = s.accounts[4];
		s.Frank =  s.accounts[5];
    s.RewardSplitter = s.accounts[6];

    crv = await ethers.getContractAt("contracts/testing/CurveInterfaces.sol:ICurveToken", s.crvAddr) as ICurveToken;
    cvx = await ethers.getContractAt("contracts/_external/IERC20.sol:IERC20", s.cvxAddr) as IERC20;
    cvxCrv = await ethers.getContractAt("contracts/_external/IERC20.sol:IERC20", s.cvxCrvAddr) as IERC20;
    vlCvx = await ethers.getContractAt("contracts/rewards/interfaces.sol:ILockedCvx", s.vlCVXAddr) as ILockedCvx;
    await network.provider.request({
      method: "hardhat_impersonateAccount", 
      params: [s.cvxWhaleAddr],      
    }); 
    s.CvxWhale = await ethers.getSigner(s.cvxWhaleAddr);
    const cvxBal = Number(await cvx.balanceOf(s.CvxWhale.address));
    expect(cvxBal).to.be.gte(1000e18);

    await network.provider.request({
      method: "hardhat_impersonateAccount", 
      params: [s.cvxCrvWhaleAddr],      
    }); 

    s.CvxCrvWhale = await ethers.getSigner(s.cvxCrvWhaleAddr);
    const cvxcrvBal = Number(await cvxCrv.balanceOf(s.CvxCrvWhale.address));
    expect(cvxcrvBal).to.be.gte(1000e18);

    const multisig = '0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB';
    await network.provider.request({
      method: "hardhat_impersonateAccount", 
      params: [multisig],      
    }); 

    await s.Frank.sendTransaction({to: multisig, value: "100" + "000000000000000000"})

    s.CvxMultisig = await ethers.getSigner(multisig);
    await vlCvx.connect(s.CvxMultisig).approveRewardDistributor(cvxCrv.address, s.cvxCrvWhaleAddr, true);

    const sendTx = await s.Frank.sendTransaction({to: s.CvxWhale.address, value: "100" + "000000000000000000"})
    // const sendResult = await sendTx.wait();
    const ethBal = Number(await s.CvxWhale.getBalance());
    const sent = await cvx.connect(s.CvxWhale).transfer(s.Andy.address, "1000" + "000000000000000000");
    // const result = await sent.wait();
    const bal = await cvx.balanceOf(s.Andy.address);
    expect(bal).to.equal(BN('1000' + '000000000000000000'));
	}); 

	it("deploy contracts and approve spending of cvx", async () => {
    let CVXDepositor = await ethers.getContractFactory("CvxDepositor");
    let CVXVoterProxy = await ethers.getContractFactory("ConvexVoterProxy");
    let AmphCVX = await ethers.getContractFactory("amphCvxToken");

    amphCvx = await AmphCVX.connect(s.Admin).deploy() as AmphCvxToken;
    await amphCvx.deployed();

    cvxVoterProxy = await CVXVoterProxy.connect(s.Admin).deploy(s.vlCVXAddr, s.Admin.address) as ConvexVoterProxy;
    await cvxVoterProxy.deployed();


    cvxDepositor = await CVXDepositor.connect(s.Admin).deploy(cvxVoterProxy.address, amphCvx.address) as CvxDepositor;
    await cvxDepositor.deployed();

    cvxVoterProxy.setDepositor(cvxDepositor.address);

    const opTx = await amphCvx.setOperator(cvxDepositor.address);

    const rewardTx = await cvxVoterProxy.connect(s.Admin).setRewardSplitter(s.RewardSplitter.address);

    const feeTx = await cvxDepositor.connect(s.Admin).setFees(0);

    const approve1 = await cvx.connect(s.Andy).approve(cvxDepositor.address, ethers.constants.MaxUint256);
    const approve1_2 = await cvx.connect(s.Andy).approve(cvxVoterProxy.address, ethers.constants.MaxUint256);

    await cvxVoterProxy.setApprovals();

    // await cvxCrv.connect(s.CvxCrvWhale).transfer(vlCvx.address, "1000" + "000000000000000000");
    await s.Frank.sendTransaction({to: s.CvxCrvWhale.address, value: "100" + "000000000000000000"})
    await cvxCrv.connect(s.CvxCrvWhale).approve(vlCvx.address, ethers.constants.MaxUint256);

    expect(await amphCvx.operator()).to.equal(cvxDepositor.address);
    expect(await cvxVoterProxy.operator()).to.equal(s.Admin.address);
    expect(await cvxVoterProxy.depositor()).to.equal(cvxDepositor.address);
    expect(await cvxDepositor.feeManager()).to.equal(s.Admin.address);

	});
});

describe("Locking Tests", () => {

	it("should hold cvx in exchange for amphCvx", async () => {
    expect(await cvx.balanceOf(s.Andy.address)).to.equal(BN('1000'+ '000000000000000000'));
    const beforeBal = Number(await cvx.balanceOf(s.vlCVXAddr));

    await cvxDepositor.connect(s.Andy)["deposit(uint256,bool)"]('500' + '000000000000000000', false);

    expect(Number(await cvx.balanceOf(cvxDepositor.address))).to.equal(500e18);
    expect(await amphCvx.balanceOf(s.Andy.address)).to.equal(BN('500' + '000000000000000000'));
	});

	it("should lock the convex", async () => {
    const beforeBal = Number(await cvx.balanceOf(s.vlCVXAddr));

    // expect(cvxDepositor.connect(s.Admin).initialLock()).to.not.be.reverted; 
    // await cvxDepositor.connect(s.Admin).initialLock();
    await cvxDepositor.connect(s.Admin).lockConvex();

    await mineBlock();

    expect(Number(await cvx.balanceOf(cvxDepositor.address))).to.equal(0);
    expect(Number(await cvx.balanceOf(s.vlCVXAddr))).to.equal(beforeBal + 500e18);
  });

	it("should let user lock cvx and get amphCvx", async () => {
    expect(await cvx.balanceOf(s.Andy.address)).to.equal(BN('500'+ '000000000000000000'));
    const beforeBal = Number(await cvx.balanceOf(s.vlCVXAddr));

    await cvxDepositor.connect(s.Andy)["deposit(uint256,bool)"]('500' + '000000000000000000', true);

    expect(Number(await cvx.balanceOf(cvxDepositor.address))).to.equal(0);
    expect(Number(await cvx.balanceOf(s.vlCVXAddr))).to.approximately(beforeBal + 500e18, 1e18);
    expect(Number(await amphCvx.balanceOf(s.Andy.address))).to.equal(1000e18);
    await fastForward(2 * OneWeek); // go forward an epochs to get voting priveleges
    await vlCvx.checkpointEpoch();
    expect(Number(await vlCvx.balanceOf(cvxVoterProxy.address))).be.equal(1000e18);
    await vlCvx.connect(s.CvxCrvWhale).notifyRewardAmount(s.cvxCrvAddr, "500" + "000000000000000000");
  });

	it("should get rewards", async () => {
    await fastForward(2 * OneWeek); // go forward an epochs to get voting priveleges
    await vlCvx.checkpointEpoch();
    await vlCvx.connect(s.CvxCrvWhale).notifyRewardAmount(s.cvxCrvAddr, "500" + "000000000000000000");
    await cvxVoterProxy.connect(s.Admin).processRewards();

    await fastForward(2 * OneWeek); // go forward an epochs to get voting priveleges
    await vlCvx.checkpointEpoch();


    feeDistro = await ethers.getContractAt('contracts/rewards/interfaces.sol:IFeeDistro', '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc') as IFeeDistro; 
    const distroAdminAddr = await feeDistro.admin();
    await network.provider.request({
      method: "hardhat_impersonateAccount", 
      params: [distroAdminAddr]
    }); 

    const distroAdmin = await ethers.getSigner(distroAdminAddr);
    await feeDistro.connect(distroAdmin).checkpoint_token();
    await cvxVoterProxy.connect(s.Admin).processRewards();
    await cvxVoterProxy.connect(s.Admin).withdrawCvxCrv(100);
    
    expect(Number(await cvxCrv.balanceOf(s.RewardSplitter.address))).to.be.greaterThan(0);
  });

	it("should let us relock after lock expiration", async () => {
    mineBlock();
    await fastForward(64 * OneWeek);
    mineBlock();
    await vlCvx.checkpointEpoch();
    // should have no voting power long after expiration
    expect(Number(await vlCvx.balanceOf(cvxVoterProxy.address))).be.equal(0);

    // pooowwwaaaaa!!!!
    await cvxVoterProxy.connect(s.Admin).processExpiredLocks(true);
    expect(Number(await vlCvx.balanceOf(cvxVoterProxy.address))).be.equal(1000e18);
  });

	it("should let us withdraw after lock expiration", async () => {
    mineBlock();
    await fastForward(64 * OneWeek);
    mineBlock();

    // should have no voting power long after expiration
    expect(Number(await vlCvx.balanceOf(cvxVoterProxy.address))).be.equal(0);

    await cvxVoterProxy.connect(s.Admin).processExpiredLocks(false);

    // moneeeyyys back
    expect(Number(await cvx.balanceOf(cvxVoterProxy.address))).to.equal(1000e18);
  });


	it("operator should be able to delegate voting power to another address", async () => {
    const delegation = await ethers.getContractAt('contracts/rewards/interfaces.sol:IDelegation', '0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446') as IDelegation;
    await cvxVoterProxy.connect(s.Admin).setDelegate(delegation.address, s.Bob.address);
    var spaceHex = web3StringToBytes32('cvx.eth');
    expect(await delegation.delegation(cvxVoterProxy.address, spaceHex)).to.be.equals(s.Bob.address);
  });
});
