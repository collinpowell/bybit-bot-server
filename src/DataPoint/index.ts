export default interface DataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  confirm: boolean;
  ema: Record<number, number>;
  macdLine: number;
  signalLine: number;
}
