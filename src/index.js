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

let PAIR_CACHE = null

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
    PAIR_CACHE.data = aiMsg.data || []
    PAIR_CACHE.timestamp = aiMsg.timestamp
    PAIR_CACHE.ai = aiMsg.ai
  }

  WS.broadcastWS(aiMsg)
  console.log('MSG', aiMsg)
})
