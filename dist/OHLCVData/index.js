"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DataPointAnalyser_1 = __importDefault(require("../DataPointAnalyser"));
const Trader_1 = __importDefault(require("../Trader"));
const client_1 = __importDefault(require("../config/client"));
const emaWindows = [12, 26, 50, 100];
class OHLCVData {
    constructor(params) {
        this.symbol = "";
        this.interval = "5";
        this.start = Date.now();
        this.end = Date.now();
        this.marketTrend = "Unknown";
        this.data = [];
        this.symbol = params.symbol;
        this.interval = params.interval;
        const trim = (params.end % this.getNumericIntervalMS()) + this.getNumericIntervalMS();
        this.start = params.start;
        this.end = params.end - trim;
        console.log(DataPointAnalyser_1.default.formatDate(this.start), DataPointAnalyser_1.default.formatDate(this.end));
    }
    getAnalyzedData() {
        return this.data;
    }
    getNumericIntervalMS() {
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
    getLimit() {
        return (Math.round((this.end - this.start) / this.getNumericIntervalMS()) + 10);
    }
    async getRawData() {
        try {
            const data = await client_1.default.getKline({
                category: "linear",
                symbol: this.symbol,
                interval: this.interval,
                start: this.start,
                end: this.end,
                limit: this.getLimit(),
            });
            //console.log(data);
            if (data.retMsg == "OK") {
                return data.result.list;
            }
            else {
                throw new Error(data.retMsg);
            }
        }
        catch (error) {
            //console.log(error);
            throw new Error(error.message);
        }
    }
    sort(data) {
        data.sort((a, b) => Number(a[0]) - Number(b[0]));
    }
    async getInitData() {
        try {
            const data = await this.getRawData();
            this.sort(data);
            return data;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async transform() {
        try {
            const chartData = await this.getInitData();
            chartData.map((item, i) => {
                //  this.data.slice(Math.max(0,i - Math.max(...emaWindows)), i)
                const newPoint = DataPointAnalyser_1.default.analyze({
                    transformedData: this.data,
                    emaWindows,
                    position: i,
                    item,
                    confirm: true,
                });
                this.data.push(newPoint);
                this.updateMarketTrend(i);
            });
        }
        catch (error) {
            console.log(error);
        }
    }
    transformSingleDP(newData) {
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
        const item = [
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
        const newPoint = DataPointAnalyser_1.default.analyze({
            transformedData: this.data,
            emaWindows,
            position,
            item,
            confirm: newData?.confirm,
        });
        if (this.data[lastPosition].confirm) {
            this.data.push(newPoint);
        }
        else {
            this.data[lastPosition] = newPoint;
        }
        this.updateMarketTrend(position);
        this.trade(newData?.close, position);
    }
    trade(currentPrice, position) {
        let lastDp = this.data[position - 1];
        let presentDp = this.data[position];
        const trade = new Trader_1.default(100000, 2);
        if (this.marketTrend == "Buy") {
            if (lastDp.macdLine < lastDp.signalLine &&
                presentDp.macdLine >= presentDp.signalLine) {
                trade.executeTrade("Buy", currentPrice);
            }
        }
        else if (this.marketTrend == "Sell") {
            if (lastDp.macdLine >= lastDp.signalLine &&
                presentDp.macdLine < presentDp.signalLine) {
                trade.executeTrade("Sell", currentPrice);
            }
        }
    }
    updateMarketTrend(position) {
        if (position < 100)
            return;
        let lastDp = this.data[position - 1];
        let presentDp = this.data[position];
        if (lastDp.ema[50] < lastDp.ema[100] &&
            presentDp.ema[50] >= presentDp.ema[100]) {
            this.marketTrend = "Buy";
        }
        else if (lastDp.ema[50] >= lastDp.ema[100] &&
            presentDp.ema[50] < presentDp.ema[100]) {
            this.marketTrend = "Sell";
        }
        console.log(presentDp.timestamp, this.marketTrend, "50 EMA => " + presentDp.ema[50], "100 EMA => " + presentDp.ema[100], "Difference => " + Math.abs(presentDp.ema[50] - presentDp.ema[100]));
    }
}
exports.default = OHLCVData;
