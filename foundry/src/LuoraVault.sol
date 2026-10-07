// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IOracle {
    function getPrice(address asset) external view returns (uint256);
}

interface IStrategy {
    function invest(uint256 amount) external returns (uint256 profit);
}

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/// @title LuoraVault — sample USDC vault used to demo Luora's visual audit views
contract LuoraVault {
    address public owner;
    address public keeper;
    IERC20 public asset;
    IOracle public oracle;
    IStrategy public strategy;
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    bool public paused;
    uint256 public feeBps = 50;
    IUniswapV2Router02 public router;
    IERC20 public rewardToken;

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    constructor(
        IERC20 _asset,
        IOracle _oracle,
        IStrategy _strategy,
        address _keeper,
        IUniswapV2Router02 _router,
        IERC20 _rewardToken
    ) {
        owner = msg.sender;
        asset = _asset;
        oracle = _oracle;
        strategy = _strategy;
        keeper = _keeper;
        router = _router;
        rewardToken = _rewardToken;
    }

    function deposit(uint256 amount) external whenNotPaused {
        uint256 minted = _computeShares(amount);
        asset.transferFrom(msg.sender, address(this), amount);
        shares[msg.sender] += minted;
        totalShares += minted;
        emit Deposit(msg.sender, amount, minted);
    }

    function withdraw(uint256 shareAmount) external whenNotPaused {
        require(shares[msg.sender] >= shareAmount, "!shares");
        uint256 value = shareAmount * _price() / 1e18;
        asset.transfer(msg.sender, value);
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        emit Withdraw(msg.sender, value, shareAmount);
    }

    function harvest() external {
        uint256 bal = asset.balanceOf(address(this));
        asset.transfer(address(strategy), bal);
        uint256 profit = strategy.invest(bal);
        _accrueFee(profit);
    }

    /// Keeper swaps strategy rewards into the vault asset through the Uniswap V2 router.
    function harvestRewards(uint256 minOut, uint256 deadline) external {
        require(msg.sender == keeper, "!keeper");
        uint256 amount = rewardToken.balanceOf(address(this));
        require(rewardToken.approve(address(router), amount), "approve");
        address[] memory path = new address[](2);
        path[0] = address(rewardToken);
        path[1] = address(asset);
        router.swapExactTokensForTokens(amount, minOut, path, address(this), deadline);
    }

    function setOracle(IOracle newOracle) external onlyOwner {
        oracle = newOracle;
    }

    function pause() external {
        require(msg.sender == keeper, "!keeper");
        paused = true;
    }

    function _computeShares(uint256 amount) internal view returns (uint256) {
        if (totalShares == 0) return amount;
        return amount * 1e18 / _price();
    }

    function _price() internal view returns (uint256) {
        return oracle.getPrice(address(asset));
    }

    function _accrueFee(uint256 profit) internal {
        uint256 fee = profit * feeBps / 10_000;
        shares[owner] += fee;
        totalShares += fee;
    }
}
