global.fetch = require("node-fetch");

const crypto = require("crypto");
const request = require("request");

const tf = require("@tensorflow/tfjs");

const encoder = tf.loadLayersModel(
  `http://tvasconcelos.eu/model/cms/uber_arch/encoder/model.json`
);
const model = tf.loadLayersModel(
  `http://tvasconcelos.eu/model/cms/uber_arch/model/model.json`
);

const API_KEY = process.env.HOPPER_KEY;
const API_SECRET = process.env.HOPPER_SECRET;
const SIGNALLER_ID = process.env.SIGNALLER_ID;

tf.setBackend("cpu");

class Predictor {
  constructor() {
    this.encoder = null;
    this.model = null;
    this.api_url = "https://www.cryptohopper.com";
    this.api_key = API_KEY;
    this.api_secret = API_SECRET;
    this.signal_id = SIGNALLER_ID;
    this.preds = [];
    encoder.then(e => (this.encoder = e)).catch(err => console.error(err));
    model.then(m => (this.model = m)).catch(err => console.error(err));
  }

  async batchPredict(pairs) {
    this.preds = [];
    return pairs.reduce(async (prevPair, nextPair) => {
      await prevPair;
      return this.getPrediction(nextPair).catch(err => console.error(err));
    }, Promise.resolve());
  }

  async getPrediction(opts) {
    if (!this.model || !this.encoder) {
      return;
    }
    if (!opts.candles) {
      return;
    }
    // console.log(opts.candles)
    try {
      const AE = tf.tensor3d([opts.candles[0]]);
      const X = tf.tensor3d([opts.candles[1]]);
      if (AE.shape !== [1, 5, 8] || X.shape !== [1, 12, 8]) {
        console.log("Wrong tensor shape.");
        return;
      }

      const AEX = await this.encoder.predict(AE);
      const AEXX = tf.concat([AEX, X], 2);
      const P = await this.model.predict(AEXX).dataSync()[0];
      AE.dispose();
      X.dispose();
      AEX.dispose();
      AEXX.dispose();
      if (P < 0.9 || isNaN(P)) {
        return;
      }
      const side = "buy";
      console.log(`${opts.exchange} / ${opts.pair}: ${side} | Prob: ${P}`);
      delete opts.candles;
      this.preds.push({
        ...opts,
        prob: P,
        side: side
      });
      return this.processSignal({
        pair: opts.pair,
        side: side,
        exchange: opts.exchange
      });
    } catch (e) {
      throw e;
    }
  }

  sendSignal(opts) {
    const headers = {
      "User-Agent": "Cryptohopper Signaller/0.0.1",
      "X-Hub-Signature": opts.signature
    };

    const options = {
      url: this.api_url + opts.path,
      method: "GET",
      headers: headers
    };

    return request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        // Print out the response body
        console.log(body);
      }
    });
  }

  hashSignature(path) {
    const hmac = crypto.createHmac("sha512", this.api_secret);
    const signature = hmac.update(path);
    return signature.digest("hex");
  }

  processSignal(opts) {
    const market = opts.pair;
    const type = opts.side;
    const path = `/signal.php?api_key=${this.api_key}&signal_id=${
      this.signal_id
    }&exchange=${
      opts.exchange === "hitbtc2" ? "hitbtc" : opts.exchange
    }&market=${market}&type=${type}`;
    const signature = this.hashSignature(path);
    this.sendSignal({
      path,
      signature
    });
    return opts;
  }
}

module.exports = Predictor;
