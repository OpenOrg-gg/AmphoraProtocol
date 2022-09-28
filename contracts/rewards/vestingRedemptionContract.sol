// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../_external/extensions/SafeERC20.sol";
import "../_external/extensions/Address.sol";
import "../_external/openzeppelin/PausableUpgradeable.sol";
import "../_external/openzeppelin/OwnableUpgradeable.sol";

import "hardhat/console.sol";

interface IERC20Mintable {
    function mint(address account, uint256 amount) external;
}

interface IERC20Burnable {
    function burnFrom(address account, uint256 amount) external;
}

contract VestingRedemptionContract is PausableUpgradeable, OwnableUpgradeable {
    event ERC20Redeemed(address indexed token, uint256 amount);
    event ERC20Released(address indexed token, uint256 amount);

    struct VestingPosition {
        address beneficiary;
        uint256 totalAllocation;
        uint256 released;
        uint64 startTimestamp;
        uint64 duration;
    }

    mapping(address => VestingPosition[]) private _vestingPositions;
    address private _vestingTokenAddress;
    address private _redemptionTokenAddress;

    uint64 private immutable maxVestingDuration = 126230400; // 4 years in seconds, 60 * 60 * 24 * (365 * 3 + 366)
    // inverse proportional function, y = vestingConstant / (vestingBias - x)
    // see documentations above the `_redeemableAmount` function for more details on the formula
    uint256 private immutable vestingConstant = 4062587586;
    uint256 private immutable vestingBias = 16250350345;

    /**
     * @dev The initialization function to call.
     * @param vestingTokenAddress The address of the token to be vested.
     * @param redemptionTokenAddress The address of the token to be redeemed.
     */
    function initialize(
        address vestingTokenAddress,
        address redemptionTokenAddress
    ) public initializer {
        require(vestingTokenAddress != address(0), "VestingRedemption: vestingTokenAddress is zero address");
        _vestingTokenAddress = vestingTokenAddress;
        _redemptionTokenAddress = redemptionTokenAddress;

        __Ownable_init();
        __Pausable_init();
    }

    /**
     * @dev Returns the address of the token to be vested.
     */
    function vestingTokenAddress() public view returns (address) {
        return _vestingTokenAddress;
    }

    /**
     * @dev Returns the address of the token to be redeemed.
     */
    function redemptionTokenAddress() public view returns (address) {
        return _redemptionTokenAddress;
    }

    /**
     * @dev Returns the number of vesting positions for a beneficiary.
     * @param account The address of the beneficiary.
     */
    function getVestingPositionCount(address account) public view returns (uint256) {
        return _vestingPositions[account].length;
    }

    /**
     * @dev Returns the vesting position for a beneficiary.
     * @param account The address of the beneficiary.
     * @param positionIndex The index of the vesting position.
     * @return VestingPosition the detailed vesting position containing the beneficiary address, total allocated
     * redemption tokens, claimed redemption tokens, start timestamp and vesting duration.
     */
    function getVestingPosition(address account, uint256 positionIndex) public view returns (VestingPosition memory) {
        return _vestingPositions[account][positionIndex];
    }

    /**
     * @dev Returns the total amount of redemption tokens that can be redeemed by a beneficiary (unclaimed + claimed).
     * @param account The address of the beneficiary.
     * @return uint256 the total amount of redemption tokens that can be redeemed by the beneficiary (unclaimed + claimed).
     */
    function getTotalAllocation(address account) public view returns (uint256) {
        uint256 totalAllocation = 0;
        for (uint256 i = 0; i < _vestingPositions[account].length; i++) {
            totalAllocation += _vestingPositions[account][i].totalAllocation;
        }
        return totalAllocation;
    }

    /**
     * @dev Returns the total amount of redemption tokens that can be claimed by a beneficiary of a vesting position.
     * @param account The address of the beneficiary.
     * @param positionIndex The index of beneficiary's all vesting positions.
     * @return uint256 the total amount of redemption tokens that can be claimed by the beneficiary of a vesting position.
     */
    function getReleasable(address account, uint256 positionIndex) public view returns (uint256) {
        uint256 unlockedAmount = _vestingSchedule(_vestingPositions[account][positionIndex], uint64(block.timestamp));
        return unlockedAmount - _vestingPositions[account][positionIndex].released;
    }

    /**
     * @dev Returns the total amount of redemption tokens that can be claimed by a beneficiary.
     * @param account The address of the beneficiary.
     * @return uint256 the total amount of redemption tokens that can be claimed by the beneficiary.
     */
    function getTotalReleasable(address account) public view returns (uint256) {
        uint256 totalReleasable = 0;
        for (uint256 i = 0; i < _vestingPositions[account].length; i++) {
            uint256 releasable = getReleasable(account, i);
            totalReleasable += releasable;
        }
        return totalReleasable;
    }

    /**
     * @dev Redeem the vesting token for the redemption token for a vesting duration.
     * @param amount The amount of redemption tokens to be redeemed.
     * @param vestingDuration The vesting duration in seconds.
     */
    function redeem(uint256 amount, uint64 vestingDuration) public whenNotPaused {
        require(amount > 0, "VestingRedemption: amount is zero");
        // cap vestingDuration to 4 years
        vestingDuration = vestingDuration > maxVestingDuration ? maxVestingDuration : vestingDuration;
        // burn vesting tokens
        IERC20Burnable(_vestingTokenAddress).burnFrom(_msgSender(), amount);

        uint256 redeemableAmount = _redeemableAmount(
            amount,
            IERC20(_vestingTokenAddress).decimals(),
            IERC20(_redemptionTokenAddress).decimals(),
            vestingDuration
        );
        if (vestingDuration == 0) {
            // directly send tokens to the msg sender
            IERC20Mintable(_redemptionTokenAddress).mint(_msgSender(), redeemableAmount);
        } else {
            // mint tokens to this contract
            IERC20Mintable(_redemptionTokenAddress).mint(address(this), redeemableAmount);
            // generating positions
            VestingPosition memory position = VestingPosition({
                beneficiary: _msgSender(),
                totalAllocation: redeemableAmount,
                released: 0,
                startTimestamp: uint64(block.timestamp),
                duration: vestingDuration
            });
            _vestingPositions[_msgSender()].push(position);
        }

        emit ERC20Redeemed(_redemptionTokenAddress, amount);
    }

    /**
     * @dev Claim the redemption tokens for a beneficiary of all vesting positions.
     */
    function releaseAll() public {
        for (uint256 i = 0; i < _vestingPositions[_msgSender()].length;) {
            uint256 releasable = getReleasable(_msgSender(), i);
            _vestingPositions[_msgSender()][i].released += releasable;

            emit ERC20Released(_redemptionTokenAddress, releasable);
            SafeERC20.safeTransfer(
                IERC20(_redemptionTokenAddress),
                _vestingPositions[_msgSender()][i].beneficiary,
                releasable
            );

            // delete fully vested position.
            if (_vestingPositions[_msgSender()][i].released >= _vestingPositions[_msgSender()][i].totalAllocation) {
                _vestingPositions[_msgSender()][i] = _vestingPositions[_msgSender()][_vestingPositions[_msgSender()].length - 1];
                _vestingPositions[_msgSender()].pop();
            } else {
                i++;
            }
        }
    }

    /**
     * @dev Returns the amount of redemption tokens that can be redeemed for a vesting token amount. Here we want
     * the exchange rate to be 0.25 (i.e., 1 vesting token = 0.25 redemption token) when duration is 0 and 1.12 when
     * duration is 4 years. Consequently, the following function adopts an inverse portioning function to approximate
     * the estimated redemption tokens by solving two equations.
     *
     * 0.25 = k / (b + 0)
     * 1.12 = k / (b + maxVestingDuration)
     *
     * By solving the above two equations, we have k approximately equal to 4062587586 and b approximately equal to
     * 16250350345.
     *
     * @param fromTokenAmount The amount of vesting tokens to be redeemed.
     * @param fromTokenDecimal The decimals of the vesting token.
     * @param toTokenDecimal The decimals of the redemption token.
     * @param duration The vesting duration in seconds.
     * @return uint256 the amount of redemption tokens that can be redeemed for a vesting token amount.
     */
    function _redeemableAmount(
        uint256 fromTokenAmount,
        uint8 fromTokenDecimal,
        uint8 toTokenDecimal,
        uint64 duration
    ) internal view returns (uint256) {
        uint256 toTokenAmount = 0;
        if (duration == 0) {
            toTokenAmount = 0;
        } else if (duration == maxVestingDuration) {
            toTokenAmount = type(uint256).max;
        } else {
            toTokenAmount = fromTokenAmount * vestingConstant / (vestingBias - duration * 100);
        }

        // cap amount
        uint256 minToTokenAmount = fromTokenAmount * 25 / 100;
        uint256 maxToTokenAmount = fromTokenAmount * 112 / 100;
        toTokenAmount = toTokenAmount < minToTokenAmount ? minToTokenAmount : toTokenAmount;
        toTokenAmount = toTokenAmount > maxToTokenAmount ? maxToTokenAmount : toTokenAmount;

        if (fromTokenDecimal > toTokenDecimal) {
            return toTokenAmount / (10 ** (fromTokenDecimal - toTokenDecimal));
        } else {
            return toTokenAmount * (10 ** (toTokenDecimal - fromTokenDecimal));
        }
    }

    /**
     * @dev Implementation of the vesting formula. This returns the amount vested, as a function of time, for
     * an asset given its total historical allocation. Currently it is a linear vesting formula.
     */
    function _vestingSchedule(VestingPosition memory position, uint64 timestamp) internal view virtual returns (uint256) {
        if (timestamp < position.startTimestamp) {
            return 0;
        } else if (timestamp > position.startTimestamp + position.duration) {
            return position.totalAllocation;
        } else {
            return (position.totalAllocation * (timestamp - position.startTimestamp)) / position.duration;
        }
    }

    /**
     * @dev Pause the contract. Redeem() function will not be available after pausing.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract. Redeem() function will be available after unpausing.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
