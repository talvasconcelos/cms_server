require('heroku-self-ping').default('https://market-scanner.herokuapp.com/', {
  interval: 25 * 60 * 1000,
})

const polka = require('polka')
const app = polka()

const Predictor = require('./predictor')
const Scanner = require('./scanner')

const scanner = new Scanner()
const pred = new Predictor()

const { PORT = 3000 } = process.env

const Twitter = require('twitter')

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  bearer_token: process.env.TWITTER_BEARER_TOKEN
});

let PAIR_CACHE = {}

app.get('/', (req, res) => {
  res.end('Hello')
})

app.listen(PORT, err => {
  if (err) throw err
  console.log(`Listening on ${PORT}`)
})

const WS = require('./websocket')({ server: app.server })

WS.wss.on('connection', ws => {
  if (PAIR_CACHE) {
    ws.send(JSON.stringify(PAIR_CACHE))
  }
})
sendTweet(`This a test at ${Date.now()}!\n\n Check out https://coinmarketscanner.app/\n #bitcoin`)
// scanner.startScanner({ test: true, time: 20000 });
scanner.startScanner()

scanner.on('aiPairs', async aipairs => {
  const aiMsg = {
    timestamp: new Date().getTime(),
  }
  if (scanner.hour) {
    await pred.batchPredict(aipairs)
    // aiMsg.ai = true;
    aiMsg.aidata = pred.preds
    await pred.batchZignaly(pred.preds.sort((a, b) => b.prob - a.prob))
    await pred.batch3Commas(pred.preds.sort((a, b) => b.prob - a.prob))
  }
  const data = aipairs
    .map(c => {
      delete c.candles
      return c
    })
    .filter(
      c =>
        JSON.stringify(c.guppy[0]) === JSON.stringify([0, 0]) &&
        JSON.stringify(c.guppy[1]) === JSON.stringify([1, 0])
    )
  aiMsg.ai = scanner.hour
  aiMsg.data = data
  if (scanner.hour) {
    PAIR_CACHE = aiMsg
  } else {
    PAIR_CACHE.data = aiMsg.data
    PAIR_CACHE.timestamp = aiMsg.timestamp
    PAIR_CACHE.ai = aiMsg.ai
  }

  WS.broadcastWS(aiMsg)
  if (scanner.hour && pred.preds.length) {
    for (const pair of pred.preds) {
      let exchange = pair.exchange === 'hitbtc2' ? 'hitbtc' : pair.exchange === 'huobipro' ? 'huobi' : pair.exchange
      let _tweet = `${pair.symbol} on ${exchange} has a ${(pair.prob * 100).toFixed(2)}% probablity of breaking out!\n\n Check out https://coinmarketscanner.app/ for more signals!\n #bitcoin #coinmarketscanner`
      sendTweet(_tweet)
    }
  }
  console.log('MSG', aiMsg)
})

function sendTweet(tweet) {
  client.post('statuses/update', { status: tweet }, function (error, tweet, response) {
    if (error) throw error;
    console.log(tweet);  // Tweet body.
    console.log(response);  // Raw response object.
    return
  });
  // return await client.post('statuses/update', { status: tweet })
  //   .then(function (tweet) {
  //     return
  //   })
  //   .catch(function (error) {
  //     throw error;
  //   })
}

/*const rrr = {
  timestamp: 1596119714778,
  aidata: [
    {
      exchange: 'bittrex',
      pair: 'BTC-SPND',
      symbol: 'SPND/BTC',
      market: 'BTC-SPND',
      close: [9.7e-7],
      guppy: [
        [1, 1],
        [1, 1],
      ],
      frontEnd: [
        9e-8,
        1e-7,
        1e-7,
        1e-7,
        1e-7,
        9e-8,
        1e-7,
        1e-7,
        9e-8,
        1e-7,
        1.1e-7,
        1.1e-7,
        1.1e-7,
        8.2e-7,
        0.00000136,
        0.0000014,
        0.00000132,
        0.00000106,
        0.0000011,
        9.7e-7,
      ],
      timestamp: 1596117689748,
      prob: 0.9998251795768738,
      side: 'buy',
    },
    {
      exchange: 'kucoin',
      pair: 'SPND-BTC',
      symbol: 'SPND/BTC',
      market: 'SPND/BTC',
      close: [9.384e-7],
      guppy: [
        [1, 1],
        [1, 1],
      ],
      frontEnd: [
        9.69e-8,
        9.59e-8,
        9.59e-8,
        9.7e-8,
        9.5e-8,
        9.45e-8,
        9.45e-8,
        9.53e-8,
        9.47e-8,
        9.47e-8,
        1.079e-7,
        1.174e-7,
        1.1e-7,
        9.098e-7,
        0.0000013889,
        0.0000013602,
        0.0000013433,
        0.0000010465,
        0.0000011462,
        9.384e-7,
      ],
      timestamp: 1596117828236,
      prob: 0.9998205900192261,
      side: 'buy',
    },
    {
      exchange: 'binance',
      pair: 'VIABTC',
      symbol: 'VIA/BTC',
      market: 'VIABTC',
      close: [0.00002581],
      guppy: [
        [1, 1],
        [1, 1],
      ],
      frontEnd: [
        0.00001843,
        0.00001891,
        0.00001897,
        0.00001896,
        0.00001868,
        0.00001897,
        0.00001906,
        0.0000192,
        0.00002004,
        0.00001957,
        0.00001953,
        0.00001943,
        0.00002138,
        0.00003054,
        0.00002734,
        0.00002562,
        0.000026,
        0.00002833,
        0.00002601,
        0.00002581,
      ],
      timestamp: 1596117659914,
      prob: 0.9997730255126953,
      side: 'buy',
    },
    {
      exchange: 'kucoin',
      pair: 'LOKI-BTC',
      symbol: 'LOKI/BTC',
      market: 'LOKI/BTC',
      close: [0.00005148],
      guppy: [
        [1, -1],
        [1, -1],
      ],
      frontEnd: [
        0.00005025,
        0.00004849,
        0.0000485,
        0.00004848,
        0.00004721,
        0.00004748,
        0.00004932,
        0.00004668,
        0.0000422,
        0.00004144,
        0.00004203,
        0.00004338,
        0.0000456,
        0.00004567,
        0.00004685,
        0.00004455,
        0.00005477,
        0.00006099,
        0.00005333,
        0.00005148,
      ],
      timestamp: 1596117828228,
      prob: 0.9991582036018372,
      side: 'buy',
    },
    {
      exchange: 'kucoin',
      pair: 'CBC-BTC',
      symbol: 'CBC/BTC',
      market: 'CBC/BTC',
      close: [0.00000196],
      guppy: [
        [0, 1],
        [0, 1],
      ],
      frontEnd: [
        0.00000226,
        0.00000218,
        0.00000224,
        0.00000217,
        0.00000217,
        0.00000217,
        0.00000219,
        0.00000219,
        0.00000219,
        0.00000233,
        0.00000249,
        0.00000267,
        0.00000285,
        0.00000301,
        0.00000304,
        0.00000318,
        0.00000318,
        0.00000289,
        0.00000181,
        0.00000196,
      ],
      timestamp: 1596117828209,
      prob: 0.9979445934295654,
      side: 'buy',
    },
    {
      exchange: 'kucoin',
      pair: 'NOIA-BTC',
      symbol: 'NOIA/BTC',
      market: 'NOIA/BTC',
      close: [0.00000648],
      guppy: [
        [1, 1],
        [1, 1],
      ],
      frontEnd: [
        0.00000522,
        0.0000054,
        0.00000525,
        0.00000523,
        0.00000525,
        0.00000533,
        0.00000544,
        0.00000565,
        0.00000553,
        0.0000054,
        0.00000541,
        0.00000522,
        0.00000536,
        0.00000551,
        0.00000622,
        0.00000704,
        0.00000602,
        0.00000618,
        0.00000623,
        0.00000648,
      ],
      timestamp: 1596117828257,
      prob: 0.9960142970085144,
      side: 'buy',
    },
    {
      exchange: 'kucoin',
      pair: 'DAG-BTC',
      symbol: 'DAG/BTC',
      market: 'DAG/BTC',
      close: [0.0000011628],
      guppy: [
        [1, 0],
        [1, 0],
      ],
      frontEnd: [
        9.902e-7,
        9.895e-7,
        9.471e-7,
        9.345e-7,
        9.919e-7,
        0.0000010318,
        0.0000010116,
        0.0000010135,
        0.0000010201,
        0.0000010226,
        0.0000010197,
        0.0000010431,
        0.000001036,
        0.00000106,
        0.0000011578,
        0.00000119,
        0.0000012162,
        0.00000116,
        0.0000011749,
        0.0000011628,
      ],
      timestamp: 1596117828214,
      prob: 0.9283877611160278,
      side: 'buy',
    },
    {
      exchange: 'hitbtc2',
      pair: 'NRGBTC',
      symbol: 'NRG/BTC',
      market: 'NRG/BTC',
      close: [0.00019397],
      guppy: [
        [-1, -1],
        [0, -1],
      ],
      frontEnd: [
        0.00018729,
        0.00019608,
        0.00019964,
        0.00019607,
        0.00019158,
        0.00019399,
        0.00019193,
        0.00018503,
        0.00018506,
        0.00019417,
        0.00019163,
        0.00019159,
        0.00019156,
        0.0001925,
        0.0001925,
        0.00019058,
        0.00019516,
        0.00019156,
        0.00019156,
        0.00019397,
      ],
      timestamp: 1596117914306,
      prob: 0.9240098595619202,
      side: 'buy',
    },
    {
      exchange: 'hitbtc2',
      pair: 'HEDGBTC',
      symbol: 'HEDG/BTC',
      market: 'HEDG/BTC',
      close: [0.00012657],
      guppy: [
        [1, -1],
        [1, -1],
      ],
      frontEnd: [
        0.0001275,
        0.00012779,
        0.0001281,
        0.00012838,
        0.00012803,
        0.0001253,
        0.0001237,
        0.00012465,
        0.00012469,
        0.0001247,
        0.000124701,
        0.000124701,
        0.000124713,
        0.000128668,
        0.000128651,
        0.00012865,
        0.00012868,
        0.00012868,
        0.0001289,
        0.00012657,
      ],
      timestamp: 1596117914278,
      prob: 0.9162757396697998,
      side: 'buy',
    },
    {
      exchange: 'binance',
      pair: 'RUNEBTC',
      symbol: 'RUNE/BTC',
      market: 'RUNEBTC',
      close: [0.000049],
      guppy: [
        [1, 1],
        [1, 1],
      ],
      frontEnd: [
        0.00004645,
        0.00004739,
        0.00004754,
        0.00004524,
        0.00004519,
        0.00004531,
        0.00004824,
        0.00004732,
        0.00004753,
        0.00005059,
        0.00005,
        0.00005065,
        0.00004901,
        0.00004761,
        0.00004768,
        0.00004694,
        0.0000475,
        0.0000476,
        0.00004791,
        0.000049,
      ],
      timestamp: 1596117660009,
      prob: 0.9067584276199341,
      side: 'buy',
    },
  ],
  ai: false,
  data: [
    {
      exchange: 'kraken',
      pair: 'PAXGXBT',
      symbol: 'PAXG/BTC',
      market: 'PAXGXBT',
      close: [0.178839],
      guppy: [
        [0, 0],
        [1, 0],
      ],
      frontEnd: [
        0.176259,
        0.176205,
        0.176212,
        0.174368,
        0.175743,
        0.178426,
        0.178093,
        0.178254,
        0.18,
        0.178183,
        0.177961,
        0.179574,
        0.178689,
        0.180955,
        0.178335,
        0.178258,
        0.180009,
        0.179858,
        0.178357,
        0.178839,
      ],
      timestamp: 1596119596818,
    },
    {
      exchange: 'hitbtc2',
      pair: 'BCHBTC',
      symbol: 'BCH/BTC',
      market: 'BCH/BTC',
      close: [0.026137],
      guppy: [
        [0, 0],
        [1, 0],
      ],
      frontEnd: [
        0.02586,
        0.026081,
        0.025963,
        0.025999,
        0.02578,
        0.025944,
        0.02575,
        0.025671,
        0.025773,
        0.025709,
        0.025734,
        0.025749,
        0.02587,
        0.025827,
        0.025958,
        0.026003,
        0.025921,
        0.02587,
        0.025864,
        0.026137,
      ],
      timestamp: 1596119714736,
    },
  ],
}*/

