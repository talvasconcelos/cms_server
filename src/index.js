const polka = require("polka");
const app = polka();

const Predictor = require("./predictor");
const Scanner = require("./scanner");
// const Hopper = require('./cryptohopper')

const scanner = new Scanner();
const pred = new Predictor();

const { PORT = 3000 } = process.env;

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
  WS.broadcastWS(aiMsg);
});

scanner.on("guppy", pairs => {
  console.log("guppyTA", pairs);
});
