## Goal:

The goal of Amphora is to allow users to use their tokens and LP tokens as collateral to borrow sUSD while still gaining rewards from LP staking.

## Core Components:


### The Vault:

Each user has an individual vault.

The vault allows users to deposit their tokens or LP tokens and be used as collateral in borrowing.

### The Vault Controller:

The Vault Controller is the main controller of the lending system, it manages the creation of vaults and allows positions to be liquidated if they are overleveraged.

### The Booster:

The Booster is the rewards manager system.  It allows us to stake a users underlying LP tokens into Convex and gain rewards that are passed on to the user.

### Reward Pools:

Each LP token has a reward pool with a set `depositToken` these are used to calculate the rewards for having deposited an LP token.

### Virtual Reward Pools:

If a token has more than one reward token, we use Virtual Reward Pools to track how much a user should recieve.

### Stash:

Since reward pools only allow us to add new tokens to the rewards distributrion after a cycle/epoch has finished, we store rewards for each pool in a  unique stash until the next cycle is ready.

## Ideal Configuration:

* A user deposits 2 WBTC and 10 3CRV LP tokens into their vault.
* Amphora deposits the 10 3CRV LP tokens into Convex.
* The users deposit tokens are attributed to their vault.
* Their vault has a function to claim rewards as they accrue into the vault.
* A user can now borrow sUSD against their 2 WBTC and 10 CRV LP tokens based on the collateral factors in the system.

## Things to improve:

- Right now, the Booster and Vault are seperate systems. It may be cleaner to make them one system.

- Currently LP tokens and regular tokens are handled seperately in the vaults. We could make all tokens use a deposit token in the vaults to make it standard.
