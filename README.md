
## setup

to setup the repo first run

`npm run setup`

then `cp SAMPLE.env .env`
and fill up .env with some values


## compile

to compile the contracts, simply run

`npm run compile`

## test

`npm run test`

## repository

```
*
├───test - test suites
│   └───mainnet/* - simulation of deployment and basic user interaction. npx hardhat test test/mainnet/index.ts
│   └───governance/* - simulation of governance processes. npx hardhat test test/governance/index.ts
├───contracts
│   ├───_external - external contracts copied into the repository, e.g. openzeppelin, uniswap, chainlink
│   ├── genesis- genesis related contracts
│   │   └── wavepool.sol - for distribution of IPT. permissioned claim
│   ├── governance - governance related contracts
│   │   ├── governor - governor is a reimplmentation of Governor Bravo, aptly named Governor Charlie. It uses a custom proxy system
│   │   │   ├── GovernorDelegate.sol - Delegate for governor contract
│   │   │   ├── GovernorDelegator.sol - Delegator for governor contract
│   │   │   ├── GovernorStorage.sol - Storage structs for governor contract
│   │   │   ├── IGovernor.sol - Interface & events for governor contract
│   │   │   ├── IIpt.sol - Helper IIpt interface
│   │   │   └── Structs.sol - Structs shared by governance
│   │   └─ token
│   │       ├── IToken.sol - Interface & events for governance token
│   │       ├── TokenDelegate.sol - Delegate for governance token
│   │       ├── TokenDelegator.sol - Delegator for governance token
│   │       └── TokenStorage.sol - Storage structs for governance token
│   ├── lending - contracts related to the IP lending system
│   │   ├── IVaultController.sol - Interface & events for vault controller
│   │   ├── IVault.sol - Interface & events for vault
│   │   ├── VaultController.sol - Vault controller, master of all vaults. manages interest across all vaults
│   │   └── Vault.sol - individual vault, simply an accounting wallet
│   ├── oracle
│   │   ├── External
│   │   │   ├── ChainlinkOracleRelay.sol - an oracle which hooks to a chainlink oracle
│   │   │   └── UniswapV3OracleRelay.sol - an oracle which hooks to a uniswap v3 pool
│   │   ├── Logic
│   │   │   └── AnchoredViewRelay.sol - an oracle which consumes two oracle relays and constructs an anchored view
│   │   ├── IOracleRelay.sol - generic interface for an oracle relay which can report a price
│   │   ├── IOracleMaster.sol - Interface for the oracle master
│   │   └── OracleMaster.sol - Oracle master is effecitvely an address book of oracle relays
│   ├── rewards
│   │   ├── Booster.sol - the primary rewards engine that controls pools.
│   │   ├── ConvexStaker.sol - the smart contract that manages staking LP pairs into Convex directly.
│   │   ├── ExtraRewardsStashConvex.sol - a rewards stash template that is designed to process Convex rewards.
│   │   ├── RewardsFactory.sol - A factory for generating base reward pools for each staking pool.
│   │   ├── StashFactory.sol - A factory for generating stashes - uses ExtraRewardsStashConvex.sol as template.
│   │   ├── TokenFactory.sol - A factory that generates deposit tokens when depositing into a pool. Deposit tokens are then staked in corresponding base reward pool.
│   │   └── VirtualBalanceRewardPool.sol - A factory that creates virtual balance reward pools that attach to a base reward pool any time there is more than one token reward per pool.
│   ├── token
│   │   └── UFragments.sol - the amplforth ufragments contract
│   ├───IUSDA.sol - interface & events for USDA
│   └───USDA.sol - relabancing erc20 token
└───hardhat.config.ts - configuration for hardhat
```
