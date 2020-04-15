require("heroku-self-ping").default("https://market-scanner.herokuapp.com/", {
  interval: 25 * 60 * 1000
});

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

WS.wss.on("connection", ws => {
  if (AI_PAIR_CACHE) {
    ws.send(JSON.stringify(AI_PAIR_CACHE));
  }
  if (PAIR_CACHE) {
    ws.send(JSON.stringify(PAIR_CACHE));
  }
});

scanner.startScanner({ time: 900000 });

scanner.on("aiPairs", async aipairs => {
  console.log("Predicting!");
  await pred.batchPredict(aipairs);
  const aiMsg = {
    ai: true,
    timestamp: new Date().getTime(),
    data: pred.preds
  };
  AI_PAIR_CACHE = aiMsg;
  WS.broadcastWS(aiMsg);
});

scanner.on("guppy", pairs => {
  WS.broadcastWS(pairs);
  PAIR_CACHE = pairs;
});
