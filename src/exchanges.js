const ccxt = require("ccxt");

const ids = [
  "binance",
  // "bittrex",
  "huobipro",
  "kraken",
  "kucoin"
  // "poloniex",
  // "hitbtc2"
];

const allExchanges = async () => {
  const exchanges = [];
  await Promise.all(
    ids.map(async id => {
      // // instantiate the exchange
      let exchange = new ccxt[id]();
      exchanges.push(exchange);

      // load markets
      // await exchange.loadMarkets();
      // console.log(exchange.id, "loaded");

      return exchange;
    })
  );

  // when all of them are ready, do your other things
  console.log("Loaded exchanges:", ids.join(", "));
  // console.log(exchanges.map(c => c.id));
  return exchanges;
};

const loadMarkets = async exchange => {
  const markets = await exchange.loadMarkets();
  return markets;
};

const getAllTickers = async exchange => {
  if (exchange.has["fetchTickers"]) {
    await loadMarkets(exchange);
    const allTickers = await exchange.fetchTickers();
    return allTickers;
  }
  return false;
};

const getCandles = async exchange => {
  try {
    let sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    let since = Date.now() - 360000000; //100 hours
    let data = {};
    // let i = 0;
    if (exchange.has.fetchOHLCV) {
      await loadMarkets(exchange);
      for (let symbol in exchange.markets) {
        // if (i > 10) break;
        let _ = exchange.markets[symbol];
        if (_.quote !== "BTC" || !_.active) continue;
        await sleep(exchange.rateLimit); // milliseconds
        let ohlcv = await exchange.fetchOHLCV(symbol, "1h", since); // one hour
        data[`${symbol}`] = {
          id: _.id,
          ohlcv
        };
        // i++;
        // console.log(symbol, "done");
      }
    }
    return data;
  } catch (e) {
    if (e instanceof ccxt.DDoSProtection) {
      console.error(exchange.id, "[DDoS Protection]");
    } else if (e instanceof ccxt.RequestTimeout) {
      console.error(exchange.id, "[Request Timeout]");
    } else if (e instanceof ccxt.AuthenticationError) {
      console.error(exchange.id, "[Authentication Error]");
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
      console.error(exchange.id, "[Exchange Not Available]");
    } else if (e instanceof ccxt.ExchangeError) {
      console.error(exchange.id, "[Exchange Error]");
    } else if (e instanceof ccxt.NetworkError) {
      console.error(exchange.id, "[Network Error]");
    } else {
      throw e;
    }
  }
};

// async function test() {
//   const ex = await allExchanges();
//   const candles = await getCandles(ex["kucoin"]);
//   fs.writeFile("data.json", JSON.stringify(candles), err => {
//     console.log("fs done");
//   });
// }

// test();

module.exports = {
  allExchanges,
  getAllTickers,
  getCandles
};
