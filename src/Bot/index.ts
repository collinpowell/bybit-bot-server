import DataPoint from "../DataPoint";
import DataPointAnalyser from "../DataPointAnalyser";
import Trader from "../Trader";
import client from "../config/client";
import { KlineIntervalV3, OHLCVKlineV5 } from "bybit-api";

const emaWindows = [12, 26, 50, 100];

interface BotDataType {
  symbol: string;
  interval: KlineIntervalV3;
  start: number;
  end: number;

  tradeQuantity: number;
  pnlRatio: number;
  profit: number;
}

class Bot extends Trader {
  //private symbol!: string;
  private interval!: KlineIntervalV3;
  private start!: number;
  private end!: number;
  public marketTrend: string = "Unknown";

  private tradePosition: number = 0;
  private data: Array<DataPoint> = [];

  private isDone: boolean = true;

  private macdLineMax: number = 0;
  private macdLineMin: number = 0;

  public constructor(params: BotDataType) {
    super(params.tradeQuantity, params.symbol, params.profit, params.pnlRatio);
    this.interval = params.interval;
    const trim =
      (params.end % this.getNumericIntervalMS()) + this.getNumericIntervalMS();
    this.start = params.start;
    this.end = params.end - trim;

    console.log(
      DataPointAnalyser.formatDate(this.start),
      DataPointAnalyser.formatDate(this.end)
    );
  }

  public getAnalyzedData() {
    return this.data;
  }

  private getNumericIntervalMS() {
    switch (this.interval) {
      case "D":
        return Number(1440) * 60000;
      case "W":
        return Number(10080) * 60000;
      case "M":
        return Number(43830) * 60000;
      default:
        return Number(this.interval) * 60000;
    }
  }

  private getLimit() {
    console.log(
      "Limit = ",
      Math.round((this.end - this.start) / this.getNumericIntervalMS()) + 10
    );
    return (
      Math.round((this.end - this.start) / this.getNumericIntervalMS()) + 10
    );
  }

  private async getRawData() {
    try {
      const data = await client.getKline({
        category: "linear",
        symbol: this.symbol,
        interval: this.interval,
        start: this.start,
        end: this.end,
        limit: this.getLimit(),
      });
      //console.log(data);
      if (data.retMsg == "OK") {
        console.log("Data Fetched Successfully");
        return data.result.list;
      } else {
        throw new Error(data.retMsg);
      }
    } catch (error: any) {
      //console.log(error);

      throw new Error(error.message);
    }
  }

  private sort(data: OHLCVKlineV5[]) {
    data.sort(
      (a: OHLCVKlineV5, b: OHLCVKlineV5) => Number(a[0]) - Number(b[0])
    );
  }

  private async getInitData() {
    try {
      const data = await this.getRawData();
      this.sort(data);
      return data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  public async transformRawData() {
    try {
      const chartData = await this.getInitData();

      chartData.map((item, i) => {
        //  this.data.slice(Math.max(0,i - Math.max(...emaWindows)), i)
        const newPoint = DataPointAnalyser.analyze({
          transformedData: this.data,
          emaWindows,
          position: i,
          item,
          confirm: true,
        });
        this.checkMACDMinMax(newPoint);
        this.data.push(newPoint);
        this.updateMarketTrend(i);
      });
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  private checkMACDMinMax(data: DataPoint) {
    if (this.macdLineMax < data.macdLine) {
      this.macdLineMax = data.macdLine;
    }

    if (this.macdLineMin > data.macdLine) {
      this.macdLineMin = data.macdLine;
    }
  }

  public transformSingleDP(newData: any) {
    const item: OHLCVKlineV5 = [
      newData?.start,
      newData?.open,
      newData.high,
      newData.low,
      newData.close,
      newData.volume,
      newData.turnover,
    ];

    let lastPosition = this.data.length - 1;
    let position = this.data[lastPosition].confirm
      ? this.data.length
      : lastPosition;

    const newPoint = DataPointAnalyser.analyze({
      transformedData: this.data,
      emaWindows,
      position,
      item,
      confirm: newData?.confirm,
    });
    this.checkMACDMinMax(newPoint);
    if (this.data[lastPosition].confirm) {
      this.data.push(newPoint);
    } else {
      this.data[lastPosition] = newPoint;
    }

    this.updateMarketTrend(position);

    this.trade(newData?.close, position);
  }

  public calculateTradeProbability(type: "Buy" | "Sell", macdLine: number) {
    let positiveProbability;
    let negativeProbability;
    if (macdLine >= 0) {
      positiveProbability = macdLine / this.macdLineMax;
      negativeProbability = 1;
    } else {
      positiveProbability = 0;
      negativeProbability = macdLine / this.macdLineMin;
    }

    const probability = (positiveProbability + negativeProbability) / 2;

    if (type == "Sell") {
      return probability * 100;
    } else if (type == "Buy") {
      return 100 - probability * 100;
    } else {
      return 0;
    }
  }

  private async trade(currentPrice: number, position: number) {
    const prevPosition = position - 1;
    let lastDp = this.data[prevPosition];
    let presentDp = this.data[position];
    if (this.marketTrend == "Buy") {
      if (
        lastDp.macdLine < lastDp.signalLine &&
        presentDp.macdLine >= presentDp.signalLine &&
        prevPosition != this.tradePosition &&
        this.isDone &&
        this.calculateTradeProbability("Buy", presentDp.macdLine) > 40
      ) {
        this.isDone = false;
        this.isDone = await this.executeTrade("Buy");
        this.tradePosition = prevPosition;
      }
    } else if (this.marketTrend == "Sell") {
      if (
        lastDp.macdLine >= lastDp.signalLine &&
        presentDp.macdLine < presentDp.signalLine &&
        prevPosition != this.tradePosition &&
        this.isDone &&
        this.calculateTradeProbability("Sell", presentDp.macdLine) > 40
      ) {
        this.isDone = false;
        this.isDone = await this.executeTrade("Sell");
        this.tradePosition = prevPosition;
      }
    }
  }

  private updateMarketTrend(position: number) {
    if (position < 100) return;
    let lastDp = this.data[position - 1];
    let presentDp = this.data[position];

    if (
      lastDp.ema[50] < lastDp.ema[100] &&
      presentDp.ema[50] >= presentDp.ema[100]
    ) {
      this.marketTrend = "Buy";
    } else if (
      lastDp.ema[50] >= lastDp.ema[100] &&
      presentDp.ema[50] < presentDp.ema[100]
    ) {
      this.marketTrend = "Sell";
    }

    console.log(
      presentDp.timestamp,
      "trades = " + this.trades.length,
      this.marketTrend,
      "50 EMA => " + presentDp.ema[50],
      "100 EMA => " + presentDp.ema[100],
      "MACD Line => " + presentDp.macdLine,
      "Signal Line => " + presentDp.signalLine
    );
  }
}

export default Bot;
