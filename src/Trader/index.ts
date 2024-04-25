import { OrderParamsV5 } from "bybit-api";
import client from "../config/client";

class Trader {
  private usdtQuantity!: number;
  private tpPercent!: number;
  private slPercent!: number;
  protected symbol!: string;
  private margin!: number;
  private qtySteps!: number;

  protected trades: Array<any> = [];

  public getStopLossPercent() {
    return this.slPercent * this.margin;
  }

  public getTakeProfitPercent() {
    return this.tpPercent * this.margin;
  }

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
    tradeFees = 0.055,
    m = 10
  ) {
    this.symbol = symbol;
    this.margin = m;
    this.usdtQuantity = usdtQuantity * m;
    // Taker Fee, For every trade Taker fee is twice one for trade execution one for TP or SL, therefore actual fee is 2*trading fee
    const f = 2 * tradeFees;

    const p = actualProfit / m;

    let x = p + f;
    let y = pnlRatio * p - f;

    if (y * m < 1) {
      y = 1 / m;
      x = (1 / pnlRatio) * (y + f) + f;
    }

    this.tpPercent = Number(x.toFixed(4));
    this.slPercent = Number(y.toFixed(4));

    this.getQtySteps().catch(()=>{
      
    })
  }

  private async getQtySteps(){
    try {
      const res = await client.getInstrumentsInfo({
        category:'linear',
        symbol:this.symbol
      })
      this.qtySteps = res.result.list[0].lotSizeFilter.qtyStep.split(".")[1].length
    } catch (error:any) {
      console.log(error.message)
    }
  }

  public async executeTrade(side: "Buy" | "Sell") {
    try {
      const res = await client.getTickers({
        category: "linear",
        symbol: this.symbol,
      });

      if(!this.qtySteps) await this.getQtySteps()

      const currentPrice = Number(res.result.list[0].lastPrice);
      const qty = String((this.usdtQuantity / currentPrice).toFixed(this.qtySteps));
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
      //console.log(td);

      const order = await client.submitOrder(td as OrderParamsV5);
      if (order.retMsg == "OK") {
        this.trades.push({
          ...td,
          timestamp: Date.now(),
        });
        return true;
      } else {
        console.log(order.retMsg);
        return false;
      }
    } catch (error: any) {
      console.error(error.message);
      return false;
    }
  }
}

export default Trader;

/**
 *
 */
