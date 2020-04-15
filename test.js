const ccxt = require("ccxt");

const exchanges = Promise.all(ccxt.exchanges);

exchanges.then(res => {
  res.map(c => console.log(c));
});
