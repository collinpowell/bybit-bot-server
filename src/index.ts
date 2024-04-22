import dotenv from "dotenv";
dotenv.config(); // Configure .env
import { KlineIntervalV3, WebsocketClient } from "bybit-api";
import express from "express";
import Bot from "./Bot";

const app = express();
const port = process.env.PORT || 3000;

async function main() {
  const days = process.env.DATA_PERIOD_DAYS
    ? Number(process.env.DATA_PERIOD_DAYS)
    : 5; // Days
  const end = Date.now();
  const start = end - 24 * days * 60 * 60 * 1000; // 24 hours in milliseconds
  const interval = process.env.INTERVAL
    ? (process.env.INTERVAL as KlineIntervalV3)
    : "5";
  const symbol = process.env.SYMBOL ? process.env.SYMBOL : "BTCUSDT";
  const tradeQuantity = process.env.AMOUNT_PER_TRADE
    ? eval(process.env.AMOUNT_PER_TRADE)
    : 100;
  const pnlRatio = process.env.PNL_RATIO ? eval(process.env.PNL_RATIO) : 1;
  const profit = process.env.PROFIT_PERCENT
    ? eval(process.env.PROFIT_PERCENT)
    : 1;

  const bot = new Bot({
    symbol,
    interval,
    start,
    end,
    tradeQuantity,
    pnlRatio,
    profit,
  });

  const transformed = await bot.transformRawData();

  if (!transformed) {
    throw new Error("Transformation Failed");
  }

  const len = bot.getAnalyzedData().length;
  console.log("Data Length => ", len);

  const topics = [`kline.${interval}.${symbol}`];

  const wsClient = new WebsocketClient({
    market: "v5",
  });

  wsClient.on("update", (data) => {
    bot.transformSingleDP(data.data[0]);

    console.log(bot.getAnalyzedData()[len-1])
  });

  try {
    //await wsClient.subscribeV5(topics[0], "linear");
  } catch (error: any) {
    console.log(error.message);
  }
}

main();

app.get("/", (req, res) => {
  res.send("Hello, Bybit Bot!");
});

app.listen(port, () => {
  console.log(`Server is running on Port: ${port}`);
});
