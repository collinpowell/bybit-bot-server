"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bybit_api_1 = require("bybit-api");
const key = process.env.API_KEY;
const secret = process.env.API_SECRET;
const demo = process.env.DEMO == 'false' ? false : true;
const client = new bybit_api_1.RestClientV5({
    key: key,
    secret: secret,
    parseAPIRateLimits: true,
    demoTrading: demo,
});
exports.default = client;
