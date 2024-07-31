const { Web3 } = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io'));

const V3_pool_ABI = require('./poolABI.json');
const factory_ABI = require('./factoryABI.json');
const token_ABI = require('./tokenABI.json');

async function getTokenInfo(contract_address) {
    const contract = new web3.eth.Contract(token_ABI, contract_address);
    const symbol = await contract.methods.symbol().call(); // ;)
    const decimals = await contract.methods.decimals().call();

    return {address: contract_address, symbol: symbol, decimals: decimals};
}
function calculatePercentageDifference(num1, num2) {
    const difference = Math.abs(num1 - num2);
    const percentageDifference = (difference / num2) * 100;

    return percentageDifference.toFixed(2);
}
async function main() {
    let wbtc = await getTokenInfo('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599');
    let usdt = await getTokenInfo('0xdAC17F958D2ee523a2206206994597C13D831ec7');
    let usdc = await getTokenInfo('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    //console.log(wbtc, usdt, usdc);

    /*
        Устанавливаем контракт factory, который нужен для определения пула
     */
    var factoryV3 = new web3.eth.Contract(factory_ABI, '0x1F98431c8aD98523631AE4a59f267346ea31F984');

    /*
        https://ethereum.stackexchange.com/questions/110464/how-to-get-uniswap-liquidity-pool-addresses
        Использую factoryABI и исходя из данного примера, мы отравляем в функцию getPool
        три параметра, два из которых адреса токенов, третье комисиия пула, 3000 = 0.3%
     */
    var poolAddressUsdt = await factoryV3.methods.getPool(wbtc.address, usdt.address, 3000).call();
    var poolAddressUsdc = await factoryV3.methods.getPool(wbtc.address, usdc.address, 3000).call();

    console.log("Адреса выбранных пулов:", poolAddressUsdt, poolAddressUsdc);

    /*
        https://stackoverflow.com/questions/69233678/using-web3js-get-coin-price-on-uniswap-and-sushiswap-exchange-without-using-thei
        Подключаем контракт, и получаем значения о стоимости, нас итересует sqrtPriceX96
     */
    var poolUsdt = new web3.eth.Contract(V3_pool_ABI, poolAddressUsdt);
    var poolBalanceUsdt = await poolUsdt.methods.slot0.call().call();
    var sqrtPriceX96Usdt = poolBalanceUsdt[0];

    var poolUsdc = new web3.eth.Contract(V3_pool_ABI, poolAddressUsdc);
    var poolBalanceUsdc = await poolUsdc.methods.slot0.call().call();
    var sqrtPriceX96Usdc = poolBalanceUsdc[0];

    /*
        https://blog.uniswap.org/uniswap-v3-math-primer
        price=(sqrtPriceX96/2^96)^2

        wbtc.decimal это 8
        usdt/usdc.decimal это 6
        10**sub = 10**2 = 100
     */
    let priceUsdt = ((parseInt(sqrtPriceX96Usdt)/2**96)**2)*(10**(parseInt(wbtc.decimals)-parseInt(usdc.decimals)));
    let priceUsdc = ((parseInt(sqrtPriceX96Usdc)/2**96)**2)*(10**(parseInt(wbtc.decimals)-parseInt(usdc.decimals)));
    let priceDiff = calculatePercentageDifference(priceUsdt, priceUsdc);
    console.log("Текущая цена токена (USDT):", priceUsdt);
    console.log("Текущая цена токена (USDC):", priceUsdc);
    console.log("Разница в цене между пулами:", priceDiff);
    if(parseFloat(priceDiff) >= 0.05){
        console.log("Возможна арбитражная возможность!");
    }
}
main();