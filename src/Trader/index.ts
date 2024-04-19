import { OrderParamsV5 } from "bybit-api";
import client from "../config/client";

class Trader {
  private usdtQuantity!: number;
  private tpPercent!: number;
  private slPercent!: number;
  private symbol!: string;

  constructor(
    usdtQuantity: number,
    tpPercent: number,
    symbol: string,
    margin = 10
  ) {
    this.symbol = symbol;
    this.usdtQuantity = usdtQuantity * margin;
    this.tpPercent = tpPercent / 10;
    this.slPercent = this.tpPercent / 2;
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
