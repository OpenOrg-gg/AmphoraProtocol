import { s } from "./scope";
import { ethers } from "hardhat";
import { BigNumber, utils } from "ethers";
import { expect, assert } from "chai";
import { getGas, getArgs, changeInBalance, payInterestMath, calculateBalance, toNumber} from "../../util/math"
import { stealMoney } from "../../util/money";
import { showBody, showBodyCyan } from "../../util/format";
import { BN } from "../../util/number";
import { advanceBlockHeight, mineBlock, fastForward, OneWeek} from "../../util/block";

const usdcAmount = BN("5000e6")

const fundDave = async () => {
    let usdc_minter = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";
    //showBody(`stealing ${s.Dave_USDC} to dave from ${s.usdcAddress}`)
    await stealMoney(
        usdc_minter,
        s.Dave.address,
        s.usdcAddress,
        s.Dave_USDC
    )
}

//set balances
describe("TESTING USDA CONTRACT", async () => {
    let startingUSDAAmount: BigNumber
    let startBlock: number
    before(async () => {
        startBlock = await ethers.provider.getBlockNumber()
        await mineBlock()
        await fundDave()
        await mineBlock()
    })

    //check admin functions
    it("check admin mint", async () => {
        await mineBlock()
        const smallAmount = utils.parseEther("100")
        const smallAmount_e6 = smallAmount.div(BN("1e12"))
        const startBalance = await s.USDA.balanceOf(s.Frank.address)

        //test for eronious input
        //should revert if not the admin
        await expect(s.USDA.connect(s.Bob).mint(smallAmount_e6)).to.be.reverted
        await expect(s.USDA.connect(s.Frank).mint(0)).to.be.reverted

        const mintResult = await s.USDA.connect(s.Frank).mint(smallAmount_e6)
        await advanceBlockHeight(1)
        const mintArgs = await getArgs(mintResult)
        assert.equal(mintArgs._value.toString(), smallAmount.toString(), "Correct amount minted from event receipt")

        const mintGas = await getGas(mintResult)
        showBodyCyan("Gas cost to mint: ", mintGas)

        let balance = await s.USDA.balanceOf(s.Frank.address)

        let difference = balance.sub(startBalance)

        //expect balance to be increased by smallAmount + interest 
        expect(difference).to.be.gt(smallAmount)

    })
    it("check admin burn", async () => {
        const smallAmount = utils.parseEther("100")
        const smallAmount_e6 = smallAmount.div(BN("1e12"))
        const startBalance = await s.USDA.balanceOf(s.Frank.address)

        //test for eronious input
        //should revert if not the admin
        await expect(s.USDA.connect(s.Bob).burn(smallAmount_e6)).to.be.reverted
        await expect(s.USDA.connect(s.Frank).burn(0)).to.be.reverted

        //should revert if not the admin
        const burnResult = await s.USDA.connect(s.Frank).mint(smallAmount_e6)
        await advanceBlockHeight(1)
        const burnArgs = await getArgs(burnResult)
        assert.equal(burnArgs._value.toString(), smallAmount.toString(), "Correct amount burned from event receipt")

        let balance = await s.USDA.balanceOf(s.Frank.address)
        let difference = balance.sub(startBalance)

        //expect balance to be decreased by smallAmount - interest
        expect(difference).to.be.gt(smallAmount)
    })

    it("check starting balance and deposit USDC", async () => {

        const startingUSDCamount = await s.USDC.balanceOf(s.Dave.address)
        assert.equal(startingUSDCamount.toString(), s.Dave_USDC.toString(), "Starting USDC balance is correct")

        //Dave already holds some USDa at this point
        startingUSDAAmount = await s.USDA.balanceOf(s.Dave.address)

        //approve
        await s.USDC.connect(s.Dave).approve(s.USDA.address, usdcAmount)

        //check pauseable 
        await s.USDA.connect(s.Frank).pause()
        await advanceBlockHeight(1)
        await expect(s.USDA.connect(s.Dave).deposit(usdcAmount)).to.be.revertedWith("Pausable: paused")
        await s.USDA.connect(s.Frank).unpause()
        await advanceBlockHeight(1)

        const depositResult = await s.USDA.connect(s.Dave).deposit(usdcAmount)
        await advanceBlockHeight(1)
        const gasUsed = await getGas(depositResult)
        showBodyCyan("Gas cost for Dave deposit: ", gasUsed)

        const depositArgs = await getArgs(depositResult)
        //scale expected USDC amount to 1e18
        assert.equal(depositArgs._value.toString(), usdcAmount.mul(BN("1e12")).toString(), "Deposit amount correct from event receipt")

        let usdcBalance = await s.USDC.balanceOf(s.Dave.address)
        assert.equal(usdcBalance.toString(), s.Dave_USDC.sub(usdcAmount).toString(), "Dave deposited USDC tokens")

        //some interest has accrued, USDa balance should be slightly higher than existingUSDa balance + USDC amount deposited 
        await s.VaultController.calculateInterest()
        await mineBlock();
        let usdaBalance = await s.USDA.balanceOf(s.Dave.address)
        expect(usdaBalance).to.be.gt(startingUSDAAmount.add(usdcAmount.mul(1e12)))
    });

    it("call deposit with amount == 0", async () => {
        //approve
        await s.USDC.connect(s.Dave).approve(s.USDA.address, usdcAmount)
        await mineBlock()

        await expect(s.USDA.connect(s.Dave).deposit(0)).to.be.revertedWith("Cannot deposit 0")
        await mineBlock()
    })

    it("call deposit with an amount that is more than what is posessed", async () => {
        let balance = await s.USDC.balanceOf(s.Eric.address)
        assert.equal(balance.toString(), "0", "Eric holds no USDC")

        //approve
        await s.USDC.connect(s.Eric).approve(s.USDA.address, utils.parseEther("500"))
        await mineBlock()

        await expect(s.USDA.connect(s.Eric).deposit(utils.parseEther("500"))).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        await mineBlock()

    })

    it("redeem USDC for USDA", async () => {
        //check pauseable 
        await s.USDA.connect(s.Frank).pause()
        await advanceBlockHeight(1)
        await expect(s.USDA.connect(s.Dave).withdraw(usdcAmount)).to.be.revertedWith("Pausable: paused")
        await s.USDA.connect(s.Frank).unpause()
        await advanceBlockHeight(1)
        const startingUSDCamount = await s.USDC.balanceOf(s.Dave.address)
        assert.equal(startingUSDCamount.toString(), s.Dave_USDC.sub(usdcAmount).toString(), "Starting USDC balance is correct")

        const withdrawResult = await s.USDA.connect(s.Dave).withdraw(usdcAmount)
        await advanceBlockHeight(1)
        const withdrawGas = await getGas(withdrawResult)
        showBodyCyan("Gas cost for Dave to withdraw: ", withdrawGas)

        let usdcBalance = await s.USDC.balanceOf(s.Dave.address)
        assert.equal(usdcBalance.toString(), s.Dave_USDC.toString(), "Dave redeemed all USDC tokens")

        //Return Dave to his original amount of USDa holdings
        let usdaBalance = await s.USDA.balanceOf(s.Dave.address)
        //should end up with slightly more USDA than original due to interest 
        expect(usdaBalance).to.be.gt(startingUSDAAmount)
    });

    it("Handles eronious withdrawl amounts, and USDa transfer", async () => {
        let startingUSDAbalance = await s.USDA.balanceOf(s.Eric.address)
        assert.equal(startingUSDAbalance.toString(), "0", "Eric does not hold any USDa")

        const smallAmount = utils.parseEther("1")
        const smallAmount_e6 = smallAmount.div(BN("1e12"))
        const tryAmount = smallAmount_e6.mul(5)

        await mineBlock()
        const transferResult = await s.USDA.connect(s.Frank).transfer(s.Eric.address, smallAmount)
        await mineBlock()
        const transferGas = await getGas(transferResult)
        showBodyCyan("Gas cost to transfer USDa: ", transferGas)

        let balance = await s.USDA.balanceOf(s.Eric.address)
        assert.equal(balance.toString(), smallAmount.toString(), "Balance is correct")

        //Eric tries to withdraw way more than should be allowed
        await expect(s.USDA.connect(s.Eric).withdraw(tryAmount)).to.be.revertedWith("insufficient funds")

    })

    it("withdraw total reserves", async () => {
        const usdaBalance = await s.USDA.balanceOf(s.Dave.address)
        const reserve = await s.USDC.balanceOf(s.USDA.address)
        const reserve_e18 = reserve.mul(BN("1e12"))
        let formatReserve = utils.formatEther(reserve_e18.toString())

        //Frank mints enough USDC to cover the withdrawl
        await s.USDA.connect(s.Frank).mint(reserve)
        await mineBlock()

        await s.USDA.connect(s.Frank).transfer(s.Dave.address, reserve_e18)
        await mineBlock()

        const usdcBalance = await s.USDC.balanceOf(s.Dave.address)

        //const withdrawResult = await s.USDA.connect(s.Dave).withdraw(reserve)
        const withdrawResult = await s.USDA.connect(s.Dave).withdrawAll()
        await mineBlock()
        const withdrawGas = await getGas(withdrawResult)
        const withdrawArgs = await getArgs(withdrawResult)
        assert.equal(withdrawArgs._value.toString(), reserve_e18.toString(), "withdrawl amount correct on event receipt")
        showBodyCyan("withdraw all gas: ", withdrawGas)

        let ending_usdcBalance = await s.USDC.balanceOf(s.Dave.address)
        let formatUSDC = utils.formatEther(ending_usdcBalance.mul(BN("1e12")).toString())
        let ending_usdaBalance = await s.USDA.balanceOf(s.Dave.address)
        const end_reserve = await s.USDC.balanceOf(s.USDA.address)
        const end_reserve_e18 = reserve.mul(BN("1e12"))
        formatReserve = utils.formatEther(end_reserve_e18.toString())

        //verify things
        //const expectedUSDAamount = usdaBalance.sub(reserve)
        const expectedUSDCamount = usdcBalance.add(reserve)
        assert.equal(expectedUSDCamount.toString(), ending_usdcBalance.toString(), "Expected USDC balance is correct")
        const expectedUSDAamount = usdaBalance.sub(reserve_e18)
        const difference = ending_usdaBalance.sub(expectedUSDAamount)

        assert.equal(end_reserve.toString(), "0", "reserve is empty")

        //cannot withdraw when reserve is empty
        await expect(s.USDA.connect(s.Dave).withdraw(1)).to.be.reverted
        await expect(s.USDA.connect(s.Dave).withdrawAll()).to.be.revertedWith("Reserve is empty")

    })
    it("Anyone can donate USDC to the protocol", async () => {
        let balance = await s.USDC.balanceOf(s.Dave.address)
        let reserve = await s.USDC.balanceOf(s.USDA.address)

        assert.equal(reserve.toString(), "0", "reserve is 0, donations welcome :)")

        //todo check totalSupply and confirm interest rate changes
        //Dave approves and donates half of his USDC
        await s.USDC.connect(s.Dave).approve(s.USDA.address, balance.div(2))
        const donateResult = await s.USDA.connect(s.Dave).donate(balance.div(2))
        await advanceBlockHeight(1)
        const donateGas = await getGas(donateResult)
        showBodyCyan("Gas cost to donate: ", donateGas)

        let updatedBalance = await s.USDC.balanceOf(s.Dave.address)
        let updatedReserve = await s.USDC.balanceOf(s.USDA.address)

        expect(updatedBalance).to.be.closeTo(updatedReserve, 100)//account for interest generation
    })

    it("what happens when someone simply transfers ether to USDa contract? ", async () => {
        let tx = {
            to: s.USDA.address,
            value: utils.parseEther("1")
        }
        await expect(s.Dave.sendTransaction(tx)).to.be.reverted
        await mineBlock()
    })
    
    /**
     * when sending USDC to USDa contract accidently, the reserve ratio responds, and the USDC goes to the reserve
     * the only way for the USDC to leave the reserve is if the reserve is sufficiently depleated
     * 
     * donations to the USDa protocol should ideally go through the donate function
     * 
     * eronious donations can be rebased into the the custody of all USDa holders by governance via the donateReserve() function
     * see ../isolated/noReserve for testing of this scenario
     */
    it("what happens when someone accidently transfers USDC to the USDa contract? ", async () => {
        const startingReserve = await s.USDC.balanceOf(s.USDA.address)
        const startingReserveRatio = await s.USDA.reserveRatio()
        const startingSupply = await s.USDA.totalSupply()

        //eroniouisly transfer USDC to USDa contract
        const smallAmount = utils.parseEther("1")
        const smallAmount_e6 = smallAmount.div(BN("1e12"))//1 USDC = 1,000,000

        await mineBlock()
        await s.USDC.connect(s.Dave).transfer(s.USDA.address, smallAmount_e6)
        await mineBlock()

        let reserve = await s.USDC.balanceOf(s.USDA.address)
        let reserveRatio = await s.USDA.reserveRatio()
        let totalSupply = await s.USDA.totalSupply()

        assert.equal(startingSupply.toString(), totalSupply.toString(), "Total supply has not changed, no USDa minted")
        expect(reserve).to.be.gt(startingReserve)//USDC received and is in the reserve
        expect(reserveRatio).to.be.gt(startingReserveRatio)//reserve ratio increased
    })

});
