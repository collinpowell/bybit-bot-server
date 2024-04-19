import { RestClientV5 } from "bybit-api";

const key = process.env.API_KEY;
const secret = process.env.API_SECRET;
const demo = process.env.DEMO == 'false' ? false : true;

const client = new RestClientV5({
  key: key,
  secret: secret,
  parseAPIRateLimits: true,
  demoTrading: demo,
});

export default client
