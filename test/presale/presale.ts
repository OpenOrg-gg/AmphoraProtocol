import { s } from "./scope";
import { ethers } from "hardhat";
import { BigNumber, utils } from "ethers";
import { keccak256, solidityKeccak256 } from "ethers/lib/utils";

import { expect, assert } from "chai";
import { showBody } from "../../util/format";
import { getArgs } from "../../util/math"
import { BN } from "../../util/number";
import { currentBlock, advanceBlockHeight, fastForward, mineBlock, OneWeek, OneYear } from "../../util/block";
import { Impersonate, stopImpersonate, Impersonator } from "../../util/impersonator"
import { start } from "repl";
import { treeFromObject, getAccountProof, createTree, treeFromAccount } from "../../util/wave"
import { sha256, sha224 } from 'js-sha256';
import MerkleTree from "merkletreejs";

import { Wave } from "../../typechain-types"

//const merkleWallets = require("../data/data.json")
const data = require("../data/data.json")
//const merkletree = createTree();


const keyAmount = BN("500e6")//500 USDC

const initMerkle = async () => {
    //8 accunts to make a simple merkle tree
    whitelist = [
        s.Frank.address,
        s.Andy.address,
        s.Bob.address,
        s.Carol.address,
        s.Dave.address,
        s.Eric.address,
        s.Gus.address,
        s.Hector.address
    ]



    const leafNodes = whitelist.map(addr => solidityKeccak256(["address", "uint256"],[addr, keyAmount]))
    



    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
    root = merkleTree.getHexRoot()

    //merkletree = treeFromAccount(whitelist)

    //showBody(merkleTree.toString())
}


let whitelist: string[]
let root: string
let merkleTree: MerkleTree
const totalSupply_ = BN("1e26")
let Wave: Wave
describe("Deploy wave", () => {

    before(async () => {
        await initMerkle()
    })

    it("deploys wave", async () => {

        //init constructor args

        const totalClaimed = totalSupply_.div(4)
        const floor = BN("5e5")//500,000 - .5 USDC
        const block = await currentBlock()
        const enableTime = block.timestamp
        const disableTime = enableTime + OneWeek
        const receiver = s.Frank.address
        //showBody(s.Frank.address)

        const waveFactory = await ethers.getContractFactory("Wave")
        Wave = await waveFactory.deploy(root, totalClaimed, floor, enableTime, disableTime, receiver)
        await mineBlock()
        await Wave.deployed()
        await mineBlock()
    })
    it("Sanity check state of Wave contract", async () => {
        const merkleRoot = await Wave.merkleRoot()
        assert.equal(merkleRoot.toString(), root, "Merkle root is correct")

        const totalClaimed = await Wave._totalClaimed()
        //showBody(totalClaimed)
        assert.equal(totalClaimed.toString(), totalSupply_.div(4).toString(), "Total reward is correct")

        const floor = await Wave._floor()
        assert.equal(floor.toNumber(), BN("5e5").toNumber(), "Floor is correct")

        const receiver = await Wave._receiver()
        assert.equal(receiver, s.Frank.address, "receiver is correct")

        const totalReward = await Wave._totalReward()
        //showBody("totalReward: ", totalReward)


    })
})


describe("Presale", () => {
    it("getPoints", async () => {

        const amount = BN("100e6")//100 USDC

        const claimer = s.Bob.address
        const claimerHash = keccak256(claimer)
        let leaf = solidityKeccak256(["address", "uint256"], [claimer, keyAmount])

        let merkleProof = merkleTree.getHexProof(leaf)
        showBody("leaf proof: ", merkleProof)

        const gpResult = await Wave.connect(s.Bob).getPoints(amount, keyAmount, merkleProof)
        await mineBlock()



    })

    it("redeem before time has elapsed", async () => {
        /**
         * 
         * 
         * 
         * 
    //getPoints

        //const addr = claimArray[2][0];
        //const key = claimArray[3][1];
        const amount = BN("100e6")//100 USDC
        const startingClaimed = await Wave._totalClaimed()

        let proof = merkleTree.getHexProof(solidityKeccak256(["address", "uint256"], [s.Andy.address, amount.toString()]))




        const pointsResult = await Wave.connect(s.Andy)
            .getPoints(
                amount,
                5,//key
                proof
                //getAccountProof(merkleTree, s.Andy.address, amount)
            )
        await mineBlock()
        //const pointsArgs = await getArgs(pointsResult)
        //showBody(pointsArgs)

        const endingClaimed = await Wave._totalClaimed()
        //showBody(startingClaimed)
        //showBody(endingClaimed)














         let redeemedState = await Wave.redeemed(s.Bob.address)
        //showBody("Initial redeemedState", redeemedState)

        await Wave.connect(s.Bob).redeem()
        await mineBlock()

        redeemedState = await Wave.redeemed(s.Bob.address)
        //showBody("new redeemedState", redeemedState)

        let isEnabled = await Wave.isEnabled()
        //showBody("isEnabled: ", isEnabled)
    

        //showBody("FAST FORWARD")
        await fastForward(OneWeek)
        await mineBlock()
         */





        //await expect(Wave.connect(s.Frank).redeem()).to.be.revertedWith("can't redeem yet")
    })
})