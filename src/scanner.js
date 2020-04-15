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
    this.allTickers = null;

    this.initScanner();
  }

  async initScanner() {
    await E.allExchanges().then(ex => {
      return (this._exchanges = ex);
    });
    await this.filterByVolume();
    //   .then(() => {
    //   fs.writeFile("data.json", JSON.stringify(this.allTickers, null, 2), err =>
    //     console.log("Done")
    //   );
    //   return;
    // });
    console.log("Pairs for analysis: ", this.allTickers.length);
    // console.log(this._exchanges[0].id);
  }

  startScanner(options) {
    options = options || {};
    this.test = options.test || false;
    options.time = options.time || 900000; //every 30 minutes
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
        console.log("start scanner");
        this.emit("scanStart");
        return resolve(true);
      });
      setInterval(() => {
        this.filterByVolume();
      }, 43200000);
      if (this.test) {
        resolve(timer.start());
      } else {
        let serverTime = Date.now();
        let milli = utils.delayedStart(15, serverTime);
        console.log("Scanner will start in", utils.milliToMin(milli));
        setTimeout(() => {
          console.log("Scanner started!", new Date());
          resolve(timer.start());
        }, milli);
      }
    });
  }

  async scan() {
    if (this._is_scanning) return;
    this._is_scanning = true;
    try {
      const start = Date.now();
      this.allData = [];
      let hour = new Date();
      hour.getMinutes() < 10 ? (this.hour = true) : (this.hour = false);
      console.log("New scan:", hour);
      await this._exchanges.reduce(async (prev, next) => {
        await prev;
        const tickersByExchange = this.allTickers
          .filter(f => f.exchange === next.id)
          .map(c => c.symbol);
        const candles = await E.getCandles(next, tickersByExchange);
        if (candles) {
          await this.createPredictionData(Object.values(candles), next.id);
        }
      }, Promise.resolve());
      // const fs = require("fs");
      // fs.writeFile("candles.json", JSON.stringify(this.allData, null, 2), err =>
      //   console.log("Done")
      // );
      this.emit("aiPairs", this.allData);
      console.log(
        `Scan ended! Elapsed: ${Math.floor((Date.now() - start) / 1000)} secs!`
      );
      this._is_scanning = false;
      if (this.test) {
        this._timer.stop();
      }
      return;
    } catch (e) {
      console.error(e);
    }
  }

  async advise(data) {
    return data.filter(c => c.guppy[0] === [0, 0] && c.guppy[1] === [1, 0]);
  }

  async createPredictionData(data, exchange) {
    try {
      // [ timestamp, open, high, low, close, volume ]
      return await data.reduce(async (prevPair, nextPair) => {
        await prevPair;
        let pair = nextPair.id;
        let res = nextPair.ohlcv;
        if (
          new Date(res[res.length - 1][0]).getHours() <
          new Date().getHours() - 1
        ) {
          console.log(`${pair} on ${exchange} skipped!`);
          return;
        }
        let guppy = utils.guppy(res.map(c => c[4])).slice(-2);
        if (
          new Date(res[res.length - 1][0]).getHours() === new Date().getHours()
        ) {
          res.pop();
        }
        let close = res.map(c => c[4]);
        let frontEnd = close.slice(-20);
        let candles = utils.prepareData(res);
        const out = {
          exchange: exchange,
          pair,
          candles,
          close: close.slice(-1),
          guppy,
          frontEnd,
          timestamp: Date.now()
        };
        return this.allData.push(out);
      }, Promise.resolve());
    } catch (e) {
      console.error(e);
    }
  }

  async filterByVolume() {
    try {
      this.allTickers = [];
      await this._exchanges.reduce(async (prev, next) => {
        await prev;
        const tickers = await E.getAllTickers(next);
        if (tickers && tickers.length) {
          this.allTickers.push(...tickers);
        }
        return;
      }, Promise.resolve());
    } catch (e) {
      console.error(e);
    }
  }
}

module.exports = Scanner;
