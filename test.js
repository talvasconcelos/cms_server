// const ccxt = require("ccxt");

// const exchanges = Promise.all(ccxt.exchanges);

// exchanges.then(res => {
//   res.map(c => console.log(c));
// });
global.fetch = require('node-fetch')

const crypto = require('crypto')
const FormData = require('form-data')

const _3commasSend = async (opts) => {
  const pair = opts.symbol.replace('/', '_')
  const exchange = opts.exchange === 'hitbtc2'
    ? 'hitbtc'
    : opts.exchange === 'huobipro'
      ? 'huobi'
      : opts.exchange
  const time = Date.now()
  const key = 'd9c6572b60d6d279ca4d055b530fc8a02d7ef1c315cb7d0ae6d4be6e2ff8ddc1c86eaa5789d986147434a6406880cdb72efa'
  const body = new FormData
  body.append("marketplace_item_id", 141)
  body.append("pair", pair)
  body.append("exchange", exchange)
  body.append("direction", "long")
  body.append("date_param", time)
  const check_string = `#{params[:${pair}]}#{params[:${exchange}]}#{params[:'long']}#{params[:141]}{params[:${time}]}`
  const sign = hashSignature(check_string, key)
  body.append("sign", sign)

  try {
    const req = await fetch("https://3commas.io/signals/v1/publish_bot_signal", {
      body,
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW"
      },
      method: "POST"
    })
    const res = await req
    console.log(res)

  } catch (e) {
    console.error(e)
  }
  return
}

function hashSignature(value, key) {
  const hmac = crypto.createHmac('sha512', key)
  const signature = hmac.update(value)
  return signature.digest('hex')
}

const testSig = {
  exchange: 'kucoin',
  pair: 'AERGO-BTC',
  symbol: 'AERGO/BTC',
  market: 'AERGO/BTC',
  close: [Array],
  guppy: [Array],
  frontEnd: [Array],
  timestamp: 1595239404275,
  prob: 0.9994124174118042,
  side: 'buy'
}

_3commasSend(testSig).then(res => {
  console.log(res)
}).catch(e => console.error(e))

const MSG = {
  timestamp: 1595239492261,
  aidata: [
    {
      exchange: 'huobipro',
      pair: 'gnxbtc',
      symbol: 'GNX/BTC',
      market: 'GNX/BTC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239336952,
      prob: 0.9996029138565063,
      side: 'buy'
    },
    {
      exchange: 'kucoin',
      pair: 'AERGO-BTC',
      symbol: 'AERGO/BTC',
      market: 'AERGO/BTC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239404275,
      prob: 0.9994124174118042,
      side: 'buy'
    },
    {
      exchange: 'kucoin',
      pair: 'NOIA-BTC',
      symbol: 'NOIA/BTC',
      market: 'NOIA/BTC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239404247,
      prob: 0.9986088871955872,
      side: 'buy'
    },
    {
      exchange: 'binance',
      pair: 'RLCBTC',
      symbol: 'RLC/BTC',
      market: 'RLCBTC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239259559,
      prob: 0.9953781366348267,
      side: 'buy'
    },
    {
      exchange: 'binance',
      pair: 'SYSBTC',
      symbol: 'SYS/BTC',
      market: 'SYSBTC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239259569,
      prob: 0.9943150877952576,
      side: 'buy'
    },
    {
      exchange: 'binance',
      pair: 'LENDBTC',
      symbol: 'LEND/BTC',
      market: 'LENDBTC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239259552,
      prob: 0.9940370321273804,
      side: 'buy'
    },
    {
      exchange: 'bittrex',
      pair: 'BTC-RLC',
      symbol: 'RLC/BTC',
      market: 'BTC-RLC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239285967,
      prob: 0.9919320940971375,
      side: 'buy'
    },
    {
      exchange: 'bittrex',
      pair: 'BTC-SYS',
      symbol: 'SYS/BTC',
      market: 'BTC-SYS',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239285970,
      prob: 0.9892789125442505,
      side: 'buy'
    },
    {
      exchange: 'binance',
      pair: 'ARKBTC',
      symbol: 'ARK/BTC',
      market: 'ARKBTC',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239259538,
      prob: 0.9866459369659424,
      side: 'buy'
    },
    {
      exchange: 'bittrex',
      pair: 'BTC-WAXP',
      symbol: 'WAXP/BTC',
      market: 'BTC-WAXP',
      close: [Array],
      guppy: [Array],
      frontEnd: [Array],
      timestamp: 1595239285971,
      prob: 0.9106762409210205,
      side: 'buy'
    }
  ],
  ai: true,
  data: []
}