global.fetch = require('node-fetch')

const crypto = require('crypto')
const request = require('request')

const tf = require('@tensorflow/tfjs')

const encoder = tf.loadLayersModel(
  `http://tvasconcelos.eu/model/cms/uber_arch/encoder/model.json`
)
const model = tf.loadLayersModel(
  `http://tvasconcelos.eu/model/cms/uber_arch/model/model.json`
)

const API_KEY = process.env.HOPPER_KEY
const API_SECRET = process.env.HOPPER_SECRET
const SIGNALLER_ID = process.env.SIGNALLER_ID
const COMMAS_SECRET = process.env.COMMAS_SECRET
const COMMAS_ID = process.env.COMMAS_ID

tf.setBackend('cpu')

class Predictor {
  constructor() {
    this.encoder = null
    this.model = null
    this.api_url = 'https://www.cryptohopper.com'
    this.api_key = API_KEY
    this.api_secret = API_SECRET
    this.signal_id = SIGNALLER_ID
    this._3commas_key = COMMAS_SECRET
    this._3commas_id = COMMAS_ID
    this.preds = []
    encoder.then(e => (this.encoder = e)).catch(err => console.error(err))
    model.then(m => (this.model = m)).catch(err => console.error(err))
  }

  async batchPredict(pairs) {
    this.preds = []
    return await pairs.reduce(async (prevPair, nextPair) => {
      await prevPair
      return this.getPrediction(nextPair).catch(err => console.error(err))
    }, Promise.resolve())
  }

  async getPrediction(opts) {
    if (!this.model || !this.encoder) {
      console.log('No AI model!')
      return
    }
    if (!opts.candles) {
      console.log('No candles!')
      return
    }
    const AE = tf.tensor3d([opts.candles[0]])
    const X = tf.tensor3d([opts.candles[1]])
    // if (AE.shape !== [1, 12, 5] || X.shape !== [1, 12, 8]) {
    //   console.log("Wrong tensor shape.");
    //   return;
    // }
    const AEX = await this.encoder.predict(AE)
    const AEXX = tf.concat([AEX, X], 2)
    const P = await this.model.predict(AEXX).dataSync()[0]
    AE.dispose()
    X.dispose()
    AEX.dispose()
    AEXX.dispose()
    if (P < 0.9 || isNaN(P)) {
      // console.log(`Skipped ${opts.exchange} / ${opts.pair} | Prob: ${P}`);
      return
    }
    const side = 'buy'
    console.log(`${opts.exchange} / ${opts.pair}: ${side} | Prob: ${P}`)
    delete opts.candles
    this.preds.push({
      ...opts,
      prob: P,
      side: side,
    })
    // await this.zignalySend({
    //   exchange: opts.exchange,
    //   pair: opts.pair,
    //   prob: P,
    // })
    return this.processSignal({
      exchange: opts.exchange,
      pair: opts.market,
      side: side,
    })
  }

  async batchZignaly(data) {
    return await data.reduce(async (prevP, nextP) => {
      await prevP
      return this.zignalySend({
        exchange: nextP.exchange,
        pair: nextP.pair,
        prob: nextP.prob,
      }).catch(err => console.error(err))
    }, Promise.resolve())
  }

  async batch3Commas(data) {
    return await data.reduce(async (prevP, nextP) => {
      await prevP
      return this._3commasSend(nextP).catch(err => console.error(err))
    }, Promise.resolve())
  }

  sendSignal(opts) {
    const headers = {
      'User-Agent': 'Cryptohopper Signaller/0.0.1',
      'X-Hub-Signature': opts.signature,
    }

    const options = {
      url: this.api_url + opts.path,
      method: 'GET',
      headers: headers,
    }

    return request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        // Print out the response body
        console.log(body)
      }
    })
  }

  async zignalySend(opts) {
    if (opts.exchange !== 'binance' && opts.exchange !== 'kucoin') return
    try {
      const req = await fetch(
        `https://zignaly.com/api/signals.php?key=${process.env.ZIG_KEY}&pair=${
        opts.pair
        }&exchange=${opts.exchange}&MDprobPerct=${
        opts.prob * 100
        }&trailingStopTriggerPercentage=2.2&trailingStopDistancePercentage=0.4`
      )
      const res = await req
      console.log(res.status, res.statusText)
    } catch (e) {
      console.error(e)
    }
    return
  }

  async _3commasSend(opts) {
    const body = new FormData
    body.append("marketplace_item_id", this._3commas_id)
    body.append("pair", opts.symbol.replace('/', '_'))
    body.append("exchange", opts.exchange === 'hitbtc2'
      ? 'hitbtc'
      : opts.exchange === 'huobipro'
        ? 'huobi'
        : opts.exchange)
    body.append("direction", "long")
    body.append("date_param", Date.now())
    const check_string = `#{params[:${body.get('pair')}]}#{params[:${body.get('exchange')}]}#{params[:${body.get('direction')}]}#{params[:${body.get('marketplace_item_id')}]}{params[:${body.get('date_param')}]}`
    const sign = this.hashSignature(check_string, this._3commas_key)
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

  hashSignature(value, key) {
    const hmac = crypto.createHmac('sha512', key)
    const signature = hmac.update(value)
    return signature.digest('hex')
  }

  processSignal(opts) {
    const market = opts.pair
    const type = opts.side
    const path = `/signal.php?api_key=${this.api_key}&signal_id=${
      this.signal_id
      }&exchange=${
      opts.exchange === 'hitbtc2'
        ? 'hitbtc'
        : opts.exchange === 'huobipro'
          ? 'huobi'
          : opts.exchange
      }&market=${market}&type=${type}`
    const signature = this.hashSignature(path, this.api_secret)
    this.sendSignal({
      path,
      signature,
    })
    return opts
  }
}

module.exports = Predictor
