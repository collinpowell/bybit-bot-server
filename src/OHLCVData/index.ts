import DataPoint from "../DataPoint";
import DataPointAnalyser from "../DataPointAnalyser";
import Trader from "../Trader";
import client from "../config/client";
import { KlineIntervalV3, OHLCVKlineV5 } from "bybit-api";

const emaWindows = [12, 26, 50, 100];

interface OHLCVDataType {
  symbol: string;
  interval: KlineIntervalV3;
  start: number;
  end: number;
}

class OHLCVData {
  private symbol!: string;
  private interval!: KlineIntervalV3;
  private start!: number;
  private end!: number;
  public marketTrend: string = "Unknown";

  private tradePosition: number = 0;
  private data: Array<DataPoint> = [];

  private isDone: boolean = true;

  public constructor(params: OHLCVDataType) {
    this.symbol = params.symbol;
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

  public async transform() {
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
        this.data.push(newPoint);
        this.updateMarketTrend(i);
      });
    } catch (error) {
      console.log(error);
    }
  }

  public transformSingleDP(newData: any) {
    /**
     * 
     * {
      start: 1713467700000,
      end: 1713467999999,
      interval: '5',
      open: '63100',
      close: '63094.9',
      high: '63208.5',
      low: '63079.7',
      volume: '109.446',
      turnover: '6911278.249',
      confirm: false,
      timestamp: 1713467829660
    }
     */
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
    if (this.data[lastPosition].confirm) {
      this.data.push(newPoint);
    } else {
      this.data[lastPosition] = newPoint;
    }

    this.updateMarketTrend(position);

    this.trade(newData?.close, position);
  }

  private async trade(currentPrice: number, position: number) {
    let lastDp = this.data[position - 1];
    let presentDp = this.data[position];

    const trade = new Trader(1000, this.symbol, 3, 1 / 1);
    if (this.marketTrend == "Buy") {
      if (
        lastDp.macdLine < lastDp.signalLine &&
        presentDp.macdLine >= presentDp.signalLine &&
        position != this.tradePosition &&
        this.isDone
      ) {
        this.isDone = false;
        this.isDone = await trade.executeTrade("Buy");
        this.tradePosition = position;
      }
    } else if (this.marketTrend == "Sell") {
      if (
        lastDp.macdLine >= lastDp.signalLine &&
        presentDp.macdLine < presentDp.signalLine &&
        position != this.tradePosition &&
        this.isDone
      ) {
        this.isDone = false;
        this.isDone = await trade.executeTrade("Sell");
        this.tradePosition = position;
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
      this.marketTrend,
      "50 EMA => " + presentDp.ema[50],
      "100 EMA => " + presentDp.ema[100],
      "Difference => " + Math.abs(presentDp.ema[50] - presentDp.ema[100])
    );
  }
}

export default OHLCVData;
