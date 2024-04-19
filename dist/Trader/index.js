"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../config/client"));
class Trader {
    constructor(usdtQuantity, tpPercent, margin = 10) {
        this.usdtQuantity = usdtQuantity * margin;
        this.tpPercent = tpPercent / 10;
        this.slPercent = this.tpPercent / 2;
    }
    executeTrade(side, currentPrice) {
        const qty = String((this.usdtQuantity / currentPrice).toFixed(3));
        let takeProfit;
        let stopLoss;
        if (side == "Buy") {
            takeProfit = currentPrice + currentPrice * (this.tpPercent / 100);
            stopLoss = currentPrice - currentPrice * (this.slPercent / 100);
        }
        else if (side == "Sell") {
            takeProfit = currentPrice - currentPrice * (this.tpPercent / 100);
            stopLoss = currentPrice + currentPrice * (this.slPercent / 100);
        }
        takeProfit = String(takeProfit);
        stopLoss = String(stopLoss);
        const td = {
            category: "linear",
            symbol: "BTCUSDT",
            side,
            orderType: "Market",
            qty,
            isLeverage: 1,
            takeProfit,
            stopLoss
        };
        console.log(td);
        client_1.default
            .submitOrder(td)
            .then((response) => {
            console.log(response);
        })
            .catch((error) => {
            console.error(error);
        });
    }
}
exports.default = Trader;
/**
 *
 */
