import { RestClientV5 } from "bybit-api";

const key = process.env.API_KEY;
const secret = process.env.API_SECRET;
const demo = process.env.DEMO == "false" ? false : true;

if (!key) {
  throw new Error("Kindly Configure API Keys and Secrets");
} else if (key.length < 1) {
  throw new Error("Kindly Configure API Keys and Secrets");
}

const client = new RestClientV5({
  key: key,
  secret: secret,
  parseAPIRateLimits: true,
  demoTrading: demo,
});

export default client;
