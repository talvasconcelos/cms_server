"use strict";
require("heroku-self-ping")(process.env.APP_URL);

const polka = require("polka");
const app = polka();

const Predictor = require("./predictor");
const Scanner = require("./scanner");

const scanner = new Scanner();
const pred = new Predictor();

const { PORT = 3000 } = process.env;

let PAIR_CACHE, AI_PAIR_CACHE;

app.get("/", (req, res) => {
  res.end("Hello");
});

app.listen(PORT, err => {
  if (err) throw err;
  console.log(`Listening on ${PORT}`);
});

const WS = require("./websocket")({ server: app.server });

scanner.startScanner({ time: 900000 });

scanner.on("aiPairs", async aipairs => {
  const preds = await pred.batchPredict(aipairs);
  const aiMsg = {
    ai: true,
    timestamp: new Date().getTime(),
    data: preds
  };
  AI_PAIR_CACHE = aiMsg;
  WS.broadcastWS(aiMsg);
});

scanner.on("guppy", pairs => {
  PAIR_CACHE = pairs;
  console.log("guppyTA", pairs);
});
