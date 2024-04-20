import Trader from "../Trader";

describe("Trader Test Suite", () => {
  test("Test For Accurate TP and SL Percentage Calculations", () => {
    const trade = new Trader(1000, "BTCUSDT", 2, 1 / 1,0.05);
    expect(trade.getStopLossPercent()).toEqual(1);
    expect(trade.getTakeProfitPercent()).toEqual(3);
  });

  test("Test Ensure SL always greater than 1%", () => {
    const trade = new Trader(1000, "BTCUSDT", 1, 1 / 1);

    expect(trade.getStopLossPercent()).toBeGreaterThanOrEqual(1);
  });

});
