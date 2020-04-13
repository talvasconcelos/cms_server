const EventEmitter = require("events");
const continuous = require("continuous");
const E = require("./exchanges");
const utils = require("./utils");

class Scanner extends EventEmitter {
  constructor(options) {
    super();
    this._is_scanning = false;
    this.hour = false;
    this._timer = null;
    this._exchanges = null;
    this.allData = null;

    this.initScanner();
  }

  async initScanner() {
    this._exchanges = await E.allExchanges();
    // console.log(this._exchanges[0].id);
  }

  startScanner(options) {
    options = options || {};
    options.time = options.time || 900000; //every 15 minutes
    options.callback = this.scan.bind(this);

    return new Promise(resolve => {
      if (this._is_scanning) {
        return resolve(false);
      }
      let timer = new continuous(options);
      timer.on("stopped", () => {
        this._is_scanning = false;
        console.log("stop scan");
      });
      this._timer = timer;
      timer.on("started", () => {
        this._is_scanning = true;
        console.log("start scanner");
        this.emit("scanStart");
        return resolve(true);
      });
      // resolve(timer.start());
      let serverTime = Date.now();
      let milli = utils.delayedStart(15, serverTime);
      console.log("Scanner will start in", utils.milliToMin(milli));
      setTimeout(() => {
        console.log("Scanner started!", new Date());
        resolve(timer.start());
      }, milli);
    });
  }

  async scan() {
    const start = Date.now();
    this.allData = [];
    let hour = new Date();
    hour.getMinutes() < 10 ? (this.hour = true) : (this.hour = false);
    console.log("New scan:", hour);
    await this._exchanges.reduce(async (prev, next) => {
      await prev;
      const candles = await E.getCandles(next);
      await this.createPredictionData(Object.values(candles), next.id);
    }, Promise.resolve());
    const guppyTA = await this.advise();
    if (guppyTA.length > 0) {
      this.emit("guppy", guppyTA);
    }
    if (this.hour) {
      this.emit("aiPairs", this.allData);
    }
    console.log(
      `Scan ended! Elapsed: ${Math.floor((Date.now() - start) / 1000)} secs!`
    );
    return;
  }

  async advise() {
    return this.allData.filter(
      c => c.guppy[0][0] === 0 && c.guppy[0][1] === 0 && c.guppy[1][0] === 1
    );
  }

  async createPredictionData(data, exchange) {
    // [ timestamp, open, high, low, close, volume ]
    return await data.reduce(async (prevPair, nextPair) => {
      await prevPair;
      let pair = nextPair.id;
      let res = nextPair.ohlcv;
      if (new Date(res[res.length - 1][0]).getHours() < new Date().getHours()) {
        console.log(`${pair} on ${exchange} skipped!`);
        return;
      }
      let close = res.map(c => c[4]);
      let guppy = utils.guppy(close).slice(-2)[0];
      let frontEnd = close.slice(-20);
      let candles = utils.prepareData(res);
      return this.allData.push({
        exchange: exchange,
        pair,
        candles,
        close: close.slice(-1),
        guppy,
        frontEnd,
        timestamp: Date.now()
      });
    }, Promise.resolve());
  }

  async filterByVolume() {}
}

module.exports = Scanner;
