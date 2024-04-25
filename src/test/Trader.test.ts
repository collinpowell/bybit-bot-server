import dotenv from "dotenv";
dotenv.config(); // Configure .env

import { KlineIntervalV3 } from "bybit-api";
import Trader from "../Trader";
import Bot from '../Bot'

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

const days = process.env.DATA_PERIOD_DAYS
  ? Number(process.env.DATA_PERIOD_DAYS)
  : 5; // Days
const end = Date.now();
const start = end - 24 * days * 60 * 60 * 1000; // 24 hours in milliseconds

describe("Trader Test Suite", () => {
  test("Test For Accurate TP and SL Percentage Calculations", () => {
    const trade = new Trader(1000, "BTCUSDT", 2, 1 / 1, 0.05);
    expect(trade.getStopLossPercent()).toEqual(1);
    expect(trade.getTakeProfitPercent()).toEqual(3);
  });

  test("Test Ensure SL always greater than 1%", () => {
    const trade = new Trader(1000, "BTCUSDT", 1, 1 / 1);

    expect(trade.getStopLossPercent()).toBeGreaterThanOrEqual(1);
  });

  // test("Trade Execution", async () => {
  //   const trade = new Trader(tradeQuantity, symbol, profit, pnlRatio);

  //   expect(await trade.executeTrade("Sell")).toEqual(true);
  // });

  test("Calculate Trade Probability", async () => {
    const bot = new Bot({
      symbol,
      interval,
      start,
      end,
      tradeQuantity,
      pnlRatio,
      profit,
    });

    expect(bot.calculateTradeProbability('Sell',150)).toEqual(87.5);
    expect(bot.calculateTradeProbability('Sell',0)).toEqual(50);
  });
});
