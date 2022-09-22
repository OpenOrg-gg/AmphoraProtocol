import { Contract } from "ethers";
import { Deployment, DeploymentInfo } from "./deployment/deployment";

const { ethers } = require("hardhat");

async function sleep(milliseconds: number) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if (new Date().getTime() - start > milliseconds) {
      break;
    }
  }
}

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  console.log("Deployer: ", deployer.address);
  let info: DeploymentInfo = {
    // start external contracts
    USDC_UNI_CL: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
    USDC_ETH_CL: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
    USDC_WBTC_CL: "0xf4030086522a5beea4988f8ca5b36dbc97bee88c",
    USDC_UNI_POOL: "0xD0fC8bA7E267f2bc56044A7715A489d851dC6D78",
    USDC_ETH_POOL: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    USDC_WBTC_POOL: "0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    // end external contracts
    // start new contracts
    ProxyAdmin: "0x3D9d8c08dC16Aa104b5B24aBDd1aD857e2c0D8C5",
    VaultController: "0x4aaE9823Fb4C70490F1d802fC697F3ffF8D5CbE3",
    USDA: "0x2A54bA2964C8Cd459Dc568853F79813a60761B58",
    Curve: "0x0029abd74B7B32e6a82Bf9f62CB9Dd4Bf8e39aAf",
    ThreeLines: "0x8Ef82C4C48FaaD513D157a86433cd7D9397eA278",
    Oracle: "0xf4818813045E954f5Dc55a40c9B60Def0ba3D477",
    CharlieDelegator: "0x266d1020A84B9E8B0ed320831838152075F8C4cA",
    CharlieDelegate: "0xdF352c2fcB3cbfdbBA619090E2A1DEB9aC534A29",
    IPTDelegator: "0xaF239a6fab6a873c779F3F33dbd34104287b93e1",
    IPTDelegate: "0x35Bb90c0B96DdB4B93ddF42aFEDd5204E91A1A10",
    EthOracle: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
    UniOracle: "0x11429eE838cC01071402f21C219870cbAc0a59A0",
    WBTCOracle: "0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593",
    AAVEOracle: "0x338ed6787f463394D24813b297401B9F05a8C9d1",
    CRVOracle: "0xbD92C6c284271c227a1e0bF1786F468b539f51D9",
    DAIOracle: "0x8dBa75e83DA73cc766A7e5a0ee71F656BAb470d6",
    DYDXOracle: "0xee35A95c9a064491531493D8b380bC40A4CCd0Da",
    FXSOracle: "0xB9B16330671067B1b062B9aC2eFd2dB75F03436E",
    LINKOracle: "0x464A1515ADc20de946f8d0DEB99cead8CEAE310d",
    OPOracle: "0x0D276FC14719f9292D5C1eA2198673d1f4269246",
    PERPOracle: "0xA12CDDd8e986AF9288ab31E58C60e65F2987fB13",
    SNXOracle: "0x2FCF37343e916eAEd1f1DdaaF84458a359b53877",
    USDTOracle: "0xECef79E109e997bCA29c1c0897ec9d7b03647F5E",
    USDCOracle: "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3",
  };

  const d = new Deployment(deployer, info);
  await d
    .ensure()
    .then(() => {
      console.log("Contracts deployed");
    })
    .catch((e) => {
      console.log(e);
    });

  // transfer ownership of
  //
  // PROXYADMIN
  // VAULTCONTROLLER
  // USDI
  // CURVEMASTER
  // ORACLEMASTER
  // IPT DELEGATOR
  // CHARLIE DELEGATOR
  // set USDI PAUSER to 0xBA20749D3a88a32ef87240149977bFa489C38a1B
  // OTHER CONTRACTS ARE NOT OWNABLE OR HAVE THE CORRECT OWNER SET
  //
  //
  // 20mm to 0x266d1020A84B9E8B0ed320831838152075F8C4cA
  // 30 mm to 0xBA20749D3a88a32ef87240149977bFa489C38a1B
  // 5 mm to 0x6c3EE242880877fd0828B99cf7B442fcCAcf15c7
  // 10 mm to 0x77e30640f242349faf210598116e5a562e7be256
  // 35mm to 0x5a4396a2fe5fD36c6528a441D7A97c3B0f3e8aeE

  const charlie = "0x266d1020A84B9E8B0ed320831838152075F8C4cA";
  let a = await d.USDA.setPauser("0xBA20749D3a88a32ef87240149977bFa489C38a1B");
  await a.wait();
  console.log("set pauser");
  a = await d.Curve.transferOwnership(charlie);
  await a.wait();
  console.log("transfer curve");
  a = await d.Oracle.transferOwnership(charlie);
  await a.wait();
  console.log("transfer oracle");
  a = await d.USDI.transferOwnership(charlie);
  await a.wait();
  console.log("transfer usdi");
  a = await d.VaultController.transferOwnership(charlie);
  await a.wait();
  console.log("transfer vc");
  a = await d.IPTDelegator._setOwner(charlie);
  await a.wait();
  console.log("transfer iptdelegator");
  a = await d.ProxyAdmin.transferOwnership(charlie);
  await a.wait();
  console.log("transfer proxy admin");
  console.log(d.Info);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
