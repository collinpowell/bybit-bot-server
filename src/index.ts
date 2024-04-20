import dotenv from "dotenv";
dotenv.config(); // Configure .env
import { DefaultLogger, WS_KEY_MAP, WebsocketClient } from "bybit-api";

import express from "express";
const app = express();
const port = process.env.PORT || 3000;
import OHLCVData from "./OHLCVData";

async function main() {
  const days = 2; // hrs
  const end = Date.now();
  const start = end - 24 * days * 60 * 60 * 1000; // 24 hours in milliseconds
  const interval = "1"
  const symbol = "BTCUSDT";

  const init = new OHLCVData({
    symbol,
    interval,
    start,
    end,
  });

  await init.transform();

  const len = init.getAnalyzedData().length;
  console.log(len)
  // console.log("-----------------------------------------------------");
  // console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 3]);
  // console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 2]);
  // console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 1]);
  // console.log("-----------------------------------------------------");

  const topics = [`kline.${interval}.${symbol}`];

  const wsClient = new WebsocketClient({
    market: "v5",
  });

  wsClient.on("update", (data) => {
    init.transformSingleDP(data.data[0]);
  });
  // wsClient.on("open", (data) => {
  //   console.log("connection opened open:");
  // });
  // wsClient.on("response", (data) => {
  //   //console.log("log response: ", JSON.stringify(data, null, 2));
  // });
  // wsClient.on("reconnect", ({ wsKey }) => {
  //   console.log("ws automatically reconnecting.... ");
  // });
  // wsClient.on("reconnected", (data) => {
  //   console.log("ws has reconnected ");
  // });

  try {
    await wsClient.subscribeV5(topics[0], "linear");
  } catch (error: any) {
    console.log(error.message);
  }
}

main();

app.get("/", (req, res) => {
  res.send("Hello, Bybit Bot!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
