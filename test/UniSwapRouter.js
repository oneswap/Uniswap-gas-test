const tokenCon = artifacts.require("DSToken");
const pairCon = artifacts.require("UniswapV2Pair");
const facCon = artifacts.require("UniswapV2Factory");
const weth9Con = artifacts.require("WETH9");
const Router = artifacts.require("UniswapV2Router02");

const Decimal = 1000000000000000000;
const ZeroAddr = "0x0000000000000000000000000000000000000000";

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function deployContracts(accounts) {
    stock = await tokenCon.new("btc", BigInt( 100000000 * Decimal).toString(), 18);
    money = await tokenCon.new("usd", BigInt(100000000 * Decimal).toString(), 18);
    weth9 = await weth9Con.new();
    factory = await facCon.new(accounts[0]);
    router = await Router.new(factory.address, weth9.address);
    console.log('Router:', Router.address);
}

contract("UniSwapGasTest", async (accounts) => {
    before(async () => {
        await deployContracts(accounts)
    });
    const owner = accounts[0];
    const taker = accounts[1];
    const maker = accounts[2];

    it('QueryTokenBalance', async () =>{
        const stockAmount = await stock.balanceOf.call(accounts[0]);
        const moneyAmount = await money.balanceOf.call(accounts[0]);
        assert.equal(stockAmount.toString(), BigInt( 100000000 * Decimal).toString(), 'Invalid balance in erc20 token');
        assert.equal(moneyAmount.toString(), BigInt( 100000000 * Decimal).toString(), 'Invalid balance in erc20 token');
    });

    it('Approve token to router', async () =>{
        await stock.approve(router.address, BigInt( 100000000 * Decimal).toString());
        await money.approve(router.address, BigInt( 100000000 * Decimal).toString());
        hash = await factory.showCreationCodeHash.call();
        console.log('creationCode hash : ' + hash);
    });

    it('AddLiquidity', async () =>{
        //function addLiquidity(
        //         address tokenA,
        //         address tokenB,
        //         uint amountADesired,
        //         uint amountBDesired,
        //         uint amountAMin,
        //         uint amountBMin,
        //         address to,
        //         uint deadline
        //     )
        let result = await router.addLiquidity(stock.address, money.address, 100000, 10000, 0, 0, accounts[2], 9999999999);
        console.log("create erc20 pair and add liquidity : ", result.receipt.gasUsed);
        console.log(result);

        pairWithTokens = await factory.getPair(stock.address, money.address);
        //console.log('pairWithTokens addr : ' + pairWithTokens);
        let pairContract = await pairCon.at(pairWithTokens);
        let liquidity = await pairContract.balanceOf.call(accounts[2]);
        //console.log('liquidity in pair: ' + liquidity.toNumber());

        await sleep(3000);
        result = await router.addLiquidity(stock.address, money.address, 100000, 10000, 100000, 10000, accounts[2], 9999999999);
        console.log("only add liquidity in erc20 pair: ", result.receipt.gasUsed);
        let price = await pairContract.price0CumulativeLast.call();
        console.log("price: ", price.toString());

        await sleep(3000);
        result = await router.addLiquidity(stock.address, money.address, 100000, 10000, 100000, 10000, accounts[2], 9999999999);
        console.log("only add liquidity in erc20 pair: ", result.receipt.gasUsed);
        price = await pairContract.price0CumulativeLast.call();
        console.log("price: ", price.toString());
        //stock/eth pair
        //function addLiquidityETH(
        //         address token,
        //         uint amountTokenDesired,
        //         uint amountTokenMin,
        //         uint amountETHMin,
        //         address to,
        //         uint deadline
        //     )
        result = await router.addLiquidityETH(stock.address, 100000, 100000, 10000, accounts[2], 9999999999, {value:10000});
        //assert.equal(result.logs[1].args.stockAmount, 100000, 'stock amount should be equal');
        //assert.equal(result.logs[1].args.moneyAmount, 10000, 'money amount should be equal');
        console.log("create eth pair and add liquidity : ", result.receipt.gasUsed);

        pairWithETH = await factory.getPair(stock.address, weth9.address);
        //console.log('pairWithETH addr : ' + pairWithETH);
        pairContract = await pairCon.at(pairWithETH);
        liquidity = await pairContract.balanceOf.call(accounts[2]);
        //console.log('liquidity in pair: ' + liquidity.toNumber());
        //assert.equal(result.logs[1].args.liquidity.toNumber(), liquidity, 'Liquidity should be equal');

        result = await router.addLiquidityETH(stock.address, 100000, 100000, 10000, accounts[2], 9999999999, {value:10000});
        console.log("only add liquidity in eth pair: ", result.receipt.gasUsed);

        esult = await router.addLiquidityETH(stock.address, 100000, 100000, 10000, accounts[2], 9999999999, {value:10000});
        console.log("only add liquidity in eth pair: ", result.receipt.gasUsed);
        //assert.true(1>2);
    });

    it('RemoveLiquidity With Tokens', async () =>{
        let pairContract = await pairCon.at(pairWithTokens);
        await pairContract.approve(router.address, 1000, {from: accounts[2]});

        //function removeLiquidity(
        //         address tokenA,
        //         address tokenB,
        //         uint liquidity,
        //         uint amountAMin,
        //         uint amountBMin,
        //         address to,
        //         uint deadline
        //     )
        let result = await router.removeLiquidity(stock.address, money.address, 1000, 10, 10, accounts[0], 9999999999, {from: accounts[2]});
        console.log("remove liquidity in erc20 pair : ", result.receipt.gasUsed);
        //*** stock/eth pair ***
        //function removeLiquidityETH(
        //         address token,
        //         uint liquidity,
        //         uint amountTokenMin,
        //         uint amountETHMin,
        //         address to,
        //         uint deadline
        //     )
        pairContract = await pairCon.at(pairWithETH);
        await pairContract.approve(router.address, 1000, {from: accounts[2]});
        result = await router.removeLiquidityETH(stock.address, 1000, 10, 10, accounts[0], 9999999999, {from: accounts[2]});
        console.log("remove liquidity in eth pair : ", result.receipt.gasUsed);
        //assert.true(1>2);
    });

    async function prepareToSwap () {
        let token1 = await tokenCon.new("abc", 1000000000, 18);
        let token2 = await tokenCon.new("def", 1000000000, 18);
        let token3 = await tokenCon.new("qwe", 1000000000, 18);
        let token4 = await tokenCon.new("wer", 1000000000, 18);

        await token1.approve(router.address, 1000000000);
        await token2.approve(router.address, 1000000000);
        await token3.approve(router.address, 1000000000);
        await token4.approve(router.address, 1000000000);

        await router.addLiquidity(token1.address, token2.address, 10000000, 1000000, 10000000, 1000000, accounts[2], 9999999999)
        await router.addLiquidity(token2.address, token3.address, 1000000, 100000, 1000000, 100000, accounts[2], 9999999999);
        await router.addLiquidity(token3.address, token4.address, 100000, 10000, 100000, 10000, accounts[2], 9999999999);
        await router.addLiquidityETH(token3.address, 10000000, 10000000, 1000000, accounts[2], 9999999999, {value: 10000000});
        await router.addLiquidityETH(token4.address, 10000000, 10000000, 1000000, accounts[2], 9999999999, {value: 10000000});

        return [token1.address, token2.address, token3.address, token4.address]
    }

    it('SwapToken', async () =>{
        //function swapExactTokensForTokens(
        //         uint amountIn,
        //         uint amountOutMin,
        //         address[] calldata path,
        //         address to,
        //         uint deadline
        //     )
        let result = await router.swapExactTokensForTokens(1000, 60, [stock.address.toString(), money.address.toString()], accounts[2], 9999999999);
        console.log('swap erc20 pair once gas used : ' + result.receipt.gasUsed);

        let tokens = await prepareToSwap();

        // token1 --> token2 --> token3 --> token4
        // 10 : 1 : 0.1 : 0.01 ==> token1 : token4 = 1000 : 1
        result = await router.swapExactTokensForTokens(1000000, 700, [tokens[0].toString(),
            tokens[1].toString(), tokens[2].toString(), tokens[3].toString()], accounts[2], 9999999999);
        console.log('swap erc20 pair fourth: ' + result.receipt.gasUsed)

        // eth --> token4
        // 1 : 10
        //function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        result = await router.swapExactETHForTokens(0,
            [weth9.address.toString(), tokens[3].toString()], accounts[2], 9999999999, {from: accounts[0], value: 10000});
        console.log('swap eth => dstoken: ' + result.receipt.gasUsed)

        //token4 -> eth
        //function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        result = await router.swapTokensForExactETH(2, 1000000,
            [tokens[2].toString(), weth9.address.toString()], accounts[2], 9999999999, {from: accounts[0]});
        console.log('swap dstoken => eth : ' + result.receipt.gasUsed)
        //assert.true(1>2);
    });
});
