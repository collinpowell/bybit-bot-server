"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Configure .env
const bybit_api_1 = require("bybit-api");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const OHLCVData_1 = __importDefault(require("./OHLCVData"));
async function main() {
    const days = 7; // hrs
    const end = Date.now();
    const start = end - 24 * days * 60 * 60 * 1000; // 24 hours in milliseconds
    // Current time in milliseconds
    const init = new OHLCVData_1.default({
        symbol: "BTCUSDT",
        interval: "5",
        start,
        end,
    });
    await init.transform();
    const len = init.getAnalyzedData().length;
    console.log("-----------------------------------------------------");
    console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 3]);
    console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 2]);
    console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 1]);
    console.log("-----------------------------------------------------");
    const topics = ["kline.5.BTCUSDT"];
    const wsClient = new bybit_api_1.WebsocketClient({
        market: "v5",
    });
    wsClient.on("update", (data) => {
        //console.log("raw message received ", data);
        init.transformSingleDP(data.data[0]);
        console.log("-----------------------------------------------------");
        console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 2]);
        console.log(init.getAnalyzedData()[init.getAnalyzedData().length - 1]);
        console.log("-----------------------------------------------------");
    });
    wsClient.on("open", (data) => {
        console.log("connection opened open:", data.wsKey);
    });
    wsClient.on("response", (data) => {
        //console.log("log response: ", JSON.stringify(data, null, 2));
    });
    wsClient.on("reconnect", ({ wsKey }) => {
        console.log("ws automatically reconnecting.... ", wsKey);
    });
    wsClient.on("reconnected", (data) => {
        console.log("ws has reconnected ", data?.wsKey);
    });
    try {
        await wsClient.subscribeV5(topics[0], "linear");
    }
    catch (error) {
        console.log(error.message);
    }
    //console.log(len);
}
main();
app.get("/", (req, res) => {
    res.send("Hello, Bybit Bot!");
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
