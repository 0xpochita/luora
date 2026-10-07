// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Minimal 6-decimal stablecoin for local tests.
contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _move(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        return _move(from, to, amount);
    }

    function _move(address from, address to, uint256 amount) internal returns (bool) {
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/// Fixed-price oracle: 1 share == 1 USDC.
contract MockOracle {
    uint256 public price = 1e18;

    function getPrice(address) external view returns (uint256) {
        return price;
    }
}

/// Uniswap V2 style router for local tests: pays out `path[last]` 1:1 by minting it (MockUSDC).
contract MockUniswapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "expired");
        require(amountIn >= amountOutMin, "slippage");
        require(MockUSDC(path[0]).transferFrom(msg.sender, address(this), amountIn), "transferFrom");
        MockUSDC(path[path.length - 1]).mint(to, amountIn);
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountIn;
    }
}

/// Strategy that just holds funds and reports a fixed 2% profit.
contract MockStrategy {
    function invest(uint256 amount) external pure returns (uint256) {
        return amount * 2 / 100;
    }
}
