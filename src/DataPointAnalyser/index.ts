import { OHLCVKlineV5 } from "bybit-api";
import DataPoint from "../DataPoint";

interface AnalyserData {
  transformedData: Array<DataPoint>;
  emaWindows: number[];
  position: number;
  item: OHLCVKlineV5;
  confirm: boolean;
}

class DataPointAnalyser {
  private position: number = 0;

  static analyze({
    transformedData,
    emaWindows,
    position,
    item,
    confirm,
  }: AnalyserData): DataPoint {
    const timestamp = Number(item[0]);
    const open = Number(item[1]);
    const high = Number(item[2]);
    const low = Number(item[3]);
    const close = Number(item[4]);
    const volume = Number(item[5]);
    const ema: Record<number, number> = {};

    if (transformedData.length < 1) {
      return {
        timestamp: this.formatDate(timestamp),
        open,
        close,
        high,
        low,
        confirm,
        ema: {},
        macdLine: 0,
        signalLine: 0,
      };
    }
    emaWindows.map((window) => {
      let prevEMA = transformedData[position - 1].ema[window];
      if (!prevEMA) {
        if (position >= window) {
          const closingPrices = transformedData
            .slice(position - window, position)
            .map((item) => item.close);
          console.log(closingPrices.length, window);
          prevEMA =
            closingPrices.reduce((sum, price) => sum + price, 0) / window; //Init EMA == SMA
        } else {
          prevEMA = 0;
        }
      }
      ema[window] = this.calculateEMA(window, prevEMA, close);
    });

    const macdLine = ema[12] && ema[26] ? ema[12] - ema[26] : 0;
    const signalWindow = 9;
    const closingMACD = transformedData
      .slice(position - signalWindow, position)
      .map((item) => item.macdLine);
    //console.log(closingMACD)
    const signalLine =
      closingMACD.reduce((sum, price) => sum + price, 0) / signalWindow;

    return {
      timestamp: this.formatDate(timestamp),
      open,
      close,
      macdLine,
      signalLine,
      high,
      low,
      confirm,
      ema,
    };
  }
  static formatDate(timestamp: string | number) {
    const date = new Date(Number(timestamp));
    //console.log(date,item[0])

    // Get date components
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2); // Months are zero-based
    const day = ("0" + date.getDate()).slice(-2);

    // Get time components
    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);

    // Construct short date and time string
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  static calculateEMA(windowSize: number, previousEMA: number, close: number) {
    if (!previousEMA) return 0;
    const multiplier = 2 / (windowSize + 1);
    return (close - previousEMA) * multiplier + previousEMA;
  }

  //private calculateEMA(windowSize = 9, price) {}
}

export default DataPointAnalyser;
