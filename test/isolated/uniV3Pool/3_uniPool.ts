import { expect, assert } from "chai";
import { ethers, network, tenderly } from "hardhat";
import { stealMoney } from "../../../util/money";
import { showBody, showBodyCyan } from "../../../util/format";
import { getArgs, getGas, truncate, toNumber, getEvent } from "../../../util/math";
import { BN } from "../../../util/number";
import { s } from "../scope";
import { advanceBlockHeight, reset, mineBlock, currentBlock, fastForward, OneYear, OneWeek } from "../../../util/block";
import { IVault__factory } from "../../../typechain-types";
//import { assert } from "console";
import { BigNumber, utils } from "ethers";
import { token } from "../../../typechain-types";

import {
    abi as FACTORY_ABI,
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'

import {
    abi as POOL_ABI,
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'
import { start } from "repl";
import { webcrypto } from "crypto";


describe("Test Uniswap V3 pool with rebasing USDi token", () => {
    //get router for uniV3
    const v2RouterAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" //V2 compatible router
    const ROUTER02_ABI = require("./util/ISwapRouter02.json")
    const router02 = new ethers.Contract(v2RouterAddress, ROUTER02_ABI, ethers.provider)

    const v3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    const ROUTER_ABI = require("./util/ISwapRouter.json")
    const router = new ethers.Contract(v3RouterAddress, ROUTER_ABI, ethers.provider)

    const nfpManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    const NFPM_ABI = require("./util/INonfungiblePositionManager.json")
    const NFPM = new ethers.Contract(nfpManagerAddress, NFPM_ABI, ethers.provider)

    //get factory for uniV3
    const v3FactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    const factoryV3 = new ethers.Contract(v3FactoryAddress, FACTORY_ABI, ethers.provider)

    let poolAddress: string
    let poolV3: any
    let tokenId: number


    const depositAmount = s.Dave_USDC.sub(BN("500e6"))
    const depositAmount_e18 = depositAmount.mul(BN("1e12"))

    //1 quarter of Dave's USDC
    const usdcDepositAmount = s.Dave_USDC.div(4)

    //0x19fdfff24c5dda5d2fcb032bda8cc4482270a8d17452a7478be427b595fe5408
    const wETHamount = utils.parseEther("5")
    const usdiAmount = BN("9745435642333408348323")

    //1 half of Bob's wETH
    const collateralAmount = s.Bob_WETH.div(2)

    let borrowAmount: BigNumber

    it("Confirms contract holds no value", async () => {
        const totalLiability = await s.VaultController.totalBaseLiability()
        expect(totalLiability).to.eq(BN("0"))

        const vaultsMinted = await s.VaultController.vaultsMinted()
        expect(vaultsMinted).to.eq(BN("0"))

        const interestFactor = await s.VaultController.interestFactor()
        expect(interestFactor).to.eq(BN("1e18"))

        const tokensRegistered = await s.VaultController.tokensRegistered()
        expect(tokensRegistered).to.eq(BN("2"))//weth && comp

        //no new USDi has been minted
        const totalSupply = await s.USDI.totalSupply()
        expect(totalSupply).to.eq(BN("1e18"))

        const scaledTotalSupply = await s.USDI.scaledTotalSupply()
        expect(scaledTotalSupply).to.eq(totalSupply.mul(BN("1e48")))

        const reserveRatio = await s.USDI.reserveRatio()
        expect(reserveRatio).to.eq(0)

    })

    it("deposit some USDC so there is some reserve", async () => {
        //dave deposits USDC
        let daveUSDC = await s.USDC.balanceOf(s.Dave.address)
        expect(await toNumber(daveUSDC)).to.eq(await toNumber(s.Dave_USDC))

        await s.USDC.connect(s.Dave).approve(s.USDI.address, usdcDepositAmount)
        await mineBlock()

        await s.USDI.connect(s.Dave).deposit(usdcDepositAmount)
        await mineBlock()

        //dave has the correct amount of USDC after deposit 
        daveUSDC = await s.USDC.balanceOf(s.Dave.address)
        expect(await toNumber(daveUSDC)).to.eq(await toNumber(s.Dave_USDC.sub(usdcDepositAmount)))

        //USDC in reserve is correct
        const reserve = await s.USDC.balanceOf(s.USDI.address)
        expect(await toNumber(reserve)).to.eq(await toNumber(usdcDepositAmount))

    })


    it("Start some liability so USDi has yield", async () => {

        //mint vault
        //Bob mints vault
        await expect(s.VaultController.connect(s.Bob).mintVault()).to.not.reverted;
        await mineBlock();
        const vaultID = await s.VaultController.vaultsMinted()
        let bobVault = await s.VaultController.vaultAddress(vaultID)
        s.BobVault = IVault__factory.connect(
            bobVault,
            s.Bob,
        );
        expect(await s.BobVault.minter()).to.eq(s.Bob.address)
        await mineBlock()


        //Bob transfers wETH collateral
        let balance = await s.WETH.balanceOf(s.Bob.address)
        expect(balance).to.eq(s.Bob_WETH)

        //Bob transfers wETH
        await s.WETH.connect(s.Bob).transfer(s.BobVault.address, collateralAmount)
        await mineBlock()

        let borrowPower = await s.VaultController.vaultBorrowingPower(vaultID)
        //borrow 80% of LTV maximum
        borrowAmount = borrowPower.sub(borrowPower.div(5))

        //borrow 
        const borrowResult = await s.VaultController.connect(s.Bob).borrowUsdi(vaultID, borrowAmount)
        await mineBlock()
        const borrowArgs = await getArgs(borrowResult)

        expect(await toNumber(borrowAmount)).to.equal(await toNumber(borrowArgs.borrowAmount))

    })


    /**
     * Modeled after a real TX on polygon and traced in tenderly, TXs below
     * 
     * Approve USDI TX: 0x9774719f616dae952e35b9a31efa69ad2eb29ab89f7d345002860022ebcee739
     * https://polygonscan.com/tx/0x9774719f616dae952e35b9a31efa69ad2eb29ab89f7d345002860022ebcee739
     * 
     * TX ID: 0x19fdfff24c5dda5d2fcb032bda8cc4482270a8d17452a7478be427b595fe5408
     * https://polygonscan.com/tx/0x19fdfff24c5dda5d2fcb032bda8cc4482270a8d17452a7478be427b595fe5408
     */
    it("Use borrowed USDi to make a uni v3 pool", async () => {

        const createPoolResult = await factoryV3.connect(s.Bob).createPool(
            s.USDI.address,
            s.WETH.address,
            10000
        )
        await mineBlock()
        const receipt = await createPoolResult.wait()
        await mineBlock()
        poolAddress = receipt!.events![0].args.pool

        poolV3 = await new ethers.Contract(poolAddress, POOL_ABI, ethers.provider)
    })

    it("mint a position on the new pool", async () => {
        const startUSDI = await s.USDI.balanceOf(s.Bob.address)
        expect(await toNumber(startUSDI)).to.be.gt(await toNumber(usdiAmount))
        const startWETH = await s.WETH.balanceOf(s.Bob.address)
        expect(await toNumber(startWETH)).to.eq(await toNumber(s.Bob_WETH.div(2)))


        const sqrtPriceX96 = BN("1893862710253677737936450510")//shamelessly stolen from tenderly 

        await poolV3.connect(s.Bob).initialize(sqrtPriceX96)
        await mineBlock()


        const block = await currentBlock()
        const deadline = block.timestamp + 500

        //approvals
        await s.USDI.connect(s.Bob).approve(nfpManagerAddress, usdiAmount)
        await mineBlock()
        await s.WETH.connect(s.Bob).approve(nfpManagerAddress, startWETH)
        await mineBlock()

        let mintParams = [
            s.USDI.address,
            s.WETH.address,
            "10000", //Fee
            "-76000", //tickLower //shamelessly stolen from tenderly 
            "-73200", //tickUpper //shamelessly stolen from tenderly 
            usdiAmount,
            wETHamount,
            usdiAmount.sub(utils.parseEther("5000")),
            wETHamount.sub(utils.parseEther("2")),
            s.Bob.address,
            deadline
        ]

        const mintResult = await NFPM.connect(s.Bob).mint(mintParams)
        await mineBlock()
        const args = await getArgs(mintResult)
        tokenId = args.tokenId.toNumber()

        let balance = await s.USDI.balanceOf(s.Bob.address)
        let difference = startUSDI.sub(balance)
        expect(await toNumber(difference)).to.be.closeTo(await toNumber(usdiAmount), 0.001)

        balance = await s.WETH.balanceOf(poolV3.address)
        expect(await toNumber(balance)).to.eq(await toNumber(wETHamount))
    })

    it("Advance time", async () => {
        const liab = await s.VaultController.totalBaseLiability()
        expect(await toNumber(liab)).to.be.gt(0)//there is liability on the protocol, so interest will accrue 
        //pass time
        await fastForward(OneYear)
        await mineBlock()
        await s.VaultController.calculateInterest()
        await mineBlock()

        const startUSDIpool = await s.USDI.balanceOf(poolV3.address)
        expect(await toNumber(startUSDIpool)).to.be.gt(await toNumber(usdiAmount))//interest accrued while in the pool

    })

    /**
     * tenderly TX 0x527383fa57675b25e47bb1eacfbb691ffb5e8c95d53747f8b3f7f4549d2407e7
     */
    it("Dave does a small swap", async () => {

        const swapUSDIamount = utils.parseEther("100")

        const startUSDIpool = await s.USDI.balanceOf(poolV3.address)
        expect(await toNumber(startUSDIpool)).to.be.gt(await toNumber(usdiAmount))//interest accrued while in the pool

        const startUSDIdave = await s.USDI.balanceOf(s.Dave.address)
        expect(await toNumber(startUSDIdave)).to.be.gt(100)//Dave has enough USDi

        const daveWeth = await s.WETH.balanceOf(s.Dave.address)
        expect(daveWeth).to.eq(0)//dave has no weth

        //approve router for 100 USDi
        await s.USDI.connect(s.Dave).approve(router.address, swapUSDIamount)
        await mineBlock()

        const block = await currentBlock()
        const deadline = block.timestamp + 500

        const swapParams = [
            s.USDI.address.toString(), //tokenIn
            s.WETH.address.toString(), //tokenOut
            "10000", //fee
            s.Dave.address.toString(), //recipient
            deadline.toString(),
            swapUSDIamount.toString(), //amountIn
            "0", //amountOutMinimum
            "0", //sqrtPriceLimitX96
        ]
        //do the swap router
        await router.connect(s.Dave).exactInputSingle(swapParams)
        await mineBlock()

        //dave received the correct amount of weth
        let balance = await s.WETH.balanceOf(s.Dave.address)
        expect(await toNumber(balance)).to.be.closeTo(0.05, 0.01)
    })

    it("Advance time again", async () => {
        const liab = await s.VaultController.totalBaseLiability()
        expect(await toNumber(liab)).to.be.gt(0)//there is liability on the protocol, so interest will accrue 
        //pass time
        await fastForward(OneYear)
        await mineBlock()
        await s.VaultController.calculateInterest()
        await mineBlock()

        const poolUSDI = await s.USDI.balanceOf(poolV3.address)
        expect(await toNumber(poolUSDI)).to.be.gt(await toNumber(usdiAmount))//interest accrued while in the pool
    })

    it("Collect fee from pool, unclaimed USDi rewards do not accrue interest", async () => {

        let startUSDI = await s.USDI.balanceOf(s.Bob.address)

        const collectParams = [
            tokenId,        //tokenId
            s.Bob.address, //recipient bob
            utils.parseEther("500000"),//amount0max - arbitrary large number
            utils.parseEther("500000")//amount1max - arbitrary large number
        ]

        await NFPM.connect(s.Bob).collect(collectParams)
        await mineBlock()

        let balance = await s.USDI.balanceOf(s.Bob.address)
        let difference = await balance.sub(startUSDI)

        //100 USDI swapped, swap fee is 1%, Bob should profit 1 USDI from swap
        expect(await toNumber(difference)).to.eq(1)
    })

    it("remove all liquidity from pool and receive USDi + interest ", async () => {

        await s.VaultController.calculateInterest()
        await mineBlock()

        //get position
        const position = await NFPM.connect(s.Bob).positions(tokenId)
        const liquidity = position.liquidity

        const poolUSDi = await s.USDI.balanceOf(poolV3.address)
        const poolWETH = await s.WETH.balanceOf(poolV3.address)

        const bobUSDI = await s.USDI.balanceOf(s.Bob.address)
        const bobWETH = await s.WETH.balanceOf(s.Bob.address)

        const block = await currentBlock()
        const deadline = block.timestamp + 500

        const DecreaseLiquidityParams = [
            tokenId,
            liquidity.toString(),//liquidity? 
            "6544876023022433160895",//amount0min
            "2965486804570273648",//amount1min
            deadline
        ]

        let dlResult = await NFPM.connect(s.Bob).decreaseLiquidity(DecreaseLiquidityParams)
        await mineBlock()
        let args = await getArgs(dlResult)
        //showBody(args)
        expect(args.tokenId.toNumber()).to.eq(tokenId)

        await s.VaultController.calculateInterest()
        await mineBlock()

        const collectParams = [
            tokenId,        //tokenId
            s.Bob.address, //recipient bob
            utils.parseEther("500000"),//amount0max - arbitrary large number
            utils.parseEther("500000")//amount1max - arbitrary large number
        ]

        await NFPM.connect(s.Bob).collect(collectParams)
        await mineBlock()

        let balance = await s.USDI.balanceOf(s.Bob.address)
        let difference = balance.sub(bobUSDI)
        expect(await toNumber(difference)).to.be.closeTo(await toNumber(usdiAmount), 100)//~correct amount of USDI removed from pool

        balance = await s.WETH.balanceOf(s.Bob.address)
        expect(await toNumber(balance)).to.be.closeTo(await toNumber(wETHamount), 0.1)//~correct amount of WETH removed from pool

        balance = await s.USDI.balanceOf(poolV3.address)
        difference = poolUSDi.sub(balance)
        expect(await toNumber(difference)).to.be.closeTo(await toNumber(usdiAmount), 100)//~correct amount of USDI removed from pool
        expect(await toNumber(balance)).to.be.gt(await toNumber(usdiAmount))//Large amount of USDI stuck in pool

        balance = await s.WETH.balanceOf(poolV3.address)
        expect(await toNumber(balance)).to.be.closeTo(0, 0.001)//WETH removed from pool

    })

    it("confirm liquidity is now 0", async () => {

        //get position
        const position = await NFPM.connect(s.Bob).positions(tokenId)
        const liquidity = position.liquidity

        expect(liquidity).to.eq(0)
    })



})