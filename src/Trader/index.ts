import { OrderParamsV5 } from "bybit-api";
import client from "../config/client";

class Trader {
  private usdtQuantity!: number;
  private tpPercent!: number;
  private slPercent!: number;
  private symbol!: string;

  /**
   *
   * Margin = m
   * Actual Profit (%) = p
   * Actual loss (%) = l
   * Take Profit (%) = x
   * Stop Loss (%) = y
   * Trading Fee (%) = f
   * PNL Ratio (L:P) = r
   *
   * p = x - f
   * l = y + f = p.r
   *
   * y = xr - f(r + 1)
   * x = 1 / r (y + f) + f
   *
   * y = rp - f
   * x = p + f
   */
  constructor(
    usdtQuantity: number,
    symbol: string,
    actualProfit: number,
    pnlRatio: number,
    m = 10
  ) {
    this.symbol = symbol;
    this.usdtQuantity = usdtQuantity * m;

    const tradingFee = 0.055;
    // Taker Fee, For every trade Taker fee is twice one for trade execution one for TP or SL, therefore actual fee is 2*trading fee
    const f = 2 * tradingFee;

    const p = actualProfit / 10;
    let x = p + f;
    let y = pnlRatio * p - f;

    if (y < 1) {
      y = 1;
      x = (1 / pnlRatio) * (y + f) + f;
    }

    this.tpPercent = x;
    this.slPercent = y;
  }

  public async executeTrade(side: "Buy" | "Sell") {
    const res = await client.getTickers({
      category: "linear",
      symbol: this.symbol,
    });

    const currentPrice = Number(res.result.list[0].lastPrice);

    const qty = String((this.usdtQuantity / currentPrice).toFixed(3));
    let takeProfit;
    let stopLoss;

    if (side == "Buy") {
      takeProfit = currentPrice + currentPrice * (this.tpPercent / 100);
      stopLoss = currentPrice - currentPrice * (this.slPercent / 100);
    } else if (side == "Sell") {
      takeProfit = currentPrice - currentPrice * (this.tpPercent / 100);
      stopLoss = currentPrice + currentPrice * (this.slPercent / 100);
    }

    takeProfit = String(takeProfit);
    stopLoss = String(stopLoss);

    const td = {
      category: "linear",
      symbol: this.symbol,
      side,
      orderType: "Market",
      qty,
      isLeverage: 1,
      takeProfit,
      stopLoss,
    };
    console.log(td);
    client
      .submitOrder(td as OrderParamsV5)
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error(error);
      });
  }
}

export default Trader;

/**
 *
 */
