/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  BigNumberish,
  Overrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  ThreeLines0_100,
  ThreeLines0_100Interface,
} from "../../../curve/Logic/ThreeLines0_100";

const _abi = [
  {
    inputs: [
      {
        internalType: "int256",
        name: "r0",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "r1",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "r2",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "r3",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "s0",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "s1",
        type: "int256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "_r0",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_r1",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_r2",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_r3",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_s0",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_s1",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "rise",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "run",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "distance",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "b",
        type: "int256",
      },
    ],
    name: "linearInterpolation",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "x_value",
        type: "int256",
      },
    ],
    name: "valueAt",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5060405161051c38038061051c83398101604081905261002f9161004f565b600095909555600193909355600291909155600355600455600555610099565b60008060008060008060c0878903121561006857600080fd5b865195506020870151945060408701519350606087015192506080870151915060a087015190509295509295509295565b610474806100a86000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063825d3c4a1161005b578063825d3c4a146100cd57806385bcfbd8146100d65780639d830ef8146100e9578063ecf62e7e146100f257600080fd5b8063414be42b1461008d57806347ba7b21146100b25780637785b716146100bb57806378a8ad5e146100c4575b600080fd5b6100a061009b36600461029c565b6100fb565b60405190815260200160405180910390f35b6100a060005481565b6100a060025481565b6100a060045481565b6100a060015481565b6100a06100e43660046102b5565b61024f565b6100a060055481565b6100a060035481565b6000670de0b6b3a7640000818312156101475760405162461bcd60e51b81526020600482015260096024820152681d1bdbc81cdb585b1b60ba1b60448201526064015b60405180910390fd5b808313156101835760405162461bcd60e51b8152602060048201526009602482015268746f6f206c6172676560b81b604482015260640161013e565b6004548312156101be576000805460015461019e91906102fd565b9050600060045490506101b582828760005461024f565b95945050505050565b60055483121561020b5760006001546002546101da91906102fd565b905060006004546005546101ee91906102fd565b90506101b582826004548861020391906102fd565b60015461024f565b80831361008857600060025460035461022491906102fd565b905060006005548361023691906102fd565b90506101b582826005548861024b91906102fd565b6002545b6000808461026087620f424061033c565b61026a91906103c1565b9050600083620f424061027d878561033c565b61028791906103c1565b61029191906103fd565b979650505050505050565b6000602082840312156102ae57600080fd5b5035919050565b600080600080608085870312156102cb57600080fd5b5050823594602084013594506040840135936060013592509050565b634e487b7160e01b600052601160045260246000fd5b60008083128015600160ff1b85018412161561031b5761031b6102e7565b6001600160ff1b0384018313811615610336576103366102e7565b50500390565b60006001600160ff1b0381841382841380821686840486111615610362576103626102e7565b600160ff1b6000871282811687830589121615610381576103816102e7565b6000871292508782058712848416161561039d5761039d6102e7565b878505871281841616156103b3576103b36102e7565b505050929093029392505050565b6000826103de57634e487b7160e01b600052601260045260246000fd5b600160ff1b8214600019841416156103f8576103f86102e7565b500590565b600080821280156001600160ff1b038490038513161561041f5761041f6102e7565b600160ff1b8390038412811615610438576104386102e7565b5050019056fea26469706673582212207d42ddb4ff079041cbe0af5ce1a911be761589656970edec5c08daa946245d4c64736f6c63430008090033";

type ThreeLines0_100ConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ThreeLines0_100ConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ThreeLines0_100__factory extends ContractFactory {
  constructor(...args: ThreeLines0_100ConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    r0: BigNumberish,
    r1: BigNumberish,
    r2: BigNumberish,
    r3: BigNumberish,
    s0: BigNumberish,
    s1: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ThreeLines0_100> {
    return super.deploy(
      r0,
      r1,
      r2,
      r3,
      s0,
      s1,
      overrides || {}
    ) as Promise<ThreeLines0_100>;
  }
  override getDeployTransaction(
    r0: BigNumberish,
    r1: BigNumberish,
    r2: BigNumberish,
    r3: BigNumberish,
    s0: BigNumberish,
    s1: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(r0, r1, r2, r3, s0, s1, overrides || {});
  }
  override attach(address: string): ThreeLines0_100 {
    return super.attach(address) as ThreeLines0_100;
  }
  override connect(signer: Signer): ThreeLines0_100__factory {
    return super.connect(signer) as ThreeLines0_100__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ThreeLines0_100Interface {
    return new utils.Interface(_abi) as ThreeLines0_100Interface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ThreeLines0_100 {
    return new Contract(address, _abi, signerOrProvider) as ThreeLines0_100;
  }
}
