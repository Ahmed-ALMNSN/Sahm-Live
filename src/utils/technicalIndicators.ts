import { ChartDataPoint } from '../types.js';

export interface CalculatedIndicatorDataPoint extends Partial<ChartDataPoint> {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
  timestamp?: number;

  // Indicators
  vwap?: number;
  ema20?: number;
  sma50?: number;
  sma20?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
  rsi?: number;
  mfi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;

  // Heikin-Ashi values
  haOpen?: number;
  haHigh?: number;
  haLow?: number;
  haClose?: number;
}

/**
 * Calculates comprehensive TradingView / Nasdaq style indicators for a series of OHLCV data.
 */
export function calculateAllTechnicalIndicators(
  rawPoints: ChartDataPoint[]
): CalculatedIndicatorDataPoint[] {
  if (!rawPoints || rawPoints.length === 0) return [];

  const points: CalculatedIndicatorDataPoint[] = rawPoints.map((pt, idx) => {
    const rawClose = Number(pt.close) || 100;
    const rawOpen = Number(pt.open) || rawClose;
    const rawHigh = Math.max(Number(pt.high) || rawClose, rawOpen, rawClose);
    const rawLow = Math.min(Number(pt.low) || rawClose, rawOpen, rawClose);
    const rawVol = Number(pt.volume) || 10000;

    return {
      ...pt,
      open: Number(rawOpen.toFixed(2)),
      high: Number(rawHigh.toFixed(2)),
      low: Number(rawLow.toFixed(2)),
      close: Number(rawClose.toFixed(2)),
      volume: rawVol,
      date: pt.date || `Point ${idx + 1}`,
    };
  });

  const n = points.length;

  // 1. VWAP Calculation
  let cumulativeTPV = 0;
  let cumulativeVol = 0;
  for (let i = 0; i < n; i++) {
    const pt = points[i];
    const typicalPrice = (pt.high + pt.low + pt.close) / 3;
    cumulativeTPV += typicalPrice * pt.volume;
    cumulativeVol += pt.volume;
    pt.vwap = cumulativeVol > 0 ? Number((cumulativeTPV / cumulativeVol).toFixed(2)) : pt.close;
  }

  // 2. SMA 20, SMA 50 & Bollinger Bands (20, 2)
  for (let i = 0; i < n; i++) {
    // SMA 20
    if (i >= 19) {
      let sum20 = 0;
      for (let j = i - 19; j <= i; j++) {
        sum20 += points[j].close;
      }
      const mean20 = sum20 / 20;
      points[i].sma20 = Number(mean20.toFixed(2));
      points[i].bbMiddle = points[i].sma20;

      // Std Dev for Bollinger Bands
      let sumSqDiff = 0;
      for (let j = i - 19; j <= i; j++) {
        sumSqDiff += Math.pow(points[j].close - mean20, 2);
      }
      const stdDev = Math.sqrt(sumSqDiff / 20);
      points[i].bbUpper = Number((mean20 + 2 * stdDev).toFixed(2));
      points[i].bbLower = Number((mean20 - 2 * stdDev).toFixed(2));
    } else {
      // Fallback for initial window
      let partialSum = 0;
      for (let j = 0; j <= i; j++) partialSum += points[j].close;
      const partialMean = partialSum / (i + 1);
      points[i].sma20 = Number(partialMean.toFixed(2));
      points[i].bbMiddle = points[i].sma20;
      points[i].bbUpper = Number((partialMean * 1.02).toFixed(2));
      points[i].bbLower = Number((partialMean * 0.98).toFixed(2));
    }

    // SMA 50
    if (i >= 49) {
      let sum50 = 0;
      for (let j = i - 49; j <= i; j++) sum50 += points[j].close;
      points[i].sma50 = Number((sum50 / 50).toFixed(2));
    } else {
      let partialSum50 = 0;
      for (let j = 0; j <= i; j++) partialSum50 += points[j].close;
      points[i].sma50 = Number((partialSum50 / (i + 1)).toFixed(2));
    }
  }

  // 3. EMA 20 Calculation
  const k20 = 2 / (20 + 1);
  let prevEMA20 = points[0].close;
  points[0].ema20 = Number(prevEMA20.toFixed(2));
  for (let i = 1; i < n; i++) {
    prevEMA20 = points[i].close * k20 + prevEMA20 * (1 - k20);
    points[i].ema20 = Number(prevEMA20.toFixed(2));
  }

  // 4. RSI 14 Calculation
  const rsiPeriod = 14;
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= Math.min(rsiPeriod, n - 1); i++) {
    const diff = points[i].close - points[i - 1].close;
    if (diff >= 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= rsiPeriod;
  avgLoss /= rsiPeriod;

  for (let i = 0; i < n; i++) {
    if (i < rsiPeriod) {
      // Approximate for initial warmup
      points[i].rsi = 50;
      continue;
    }
    const diff = points[i].close - points[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
    avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;

    if (avgLoss === 0) {
      points[i].rsi = 100;
    } else {
      const rs = avgGain / avgLoss;
      points[i].rsi = Number((100 - 100 / (1 + rs)).toFixed(1));
    }
  }

  // 5. Money Flow Index (MFI 14) Calculation
  for (let i = 0; i < n; i++) {
    if (i < 14) {
      points[i].mfi = points[i].rsi || 50;
      continue;
    }
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - 13; j <= i; j++) {
      const curTP = (points[j].high + points[j].low + points[j].close) / 3;
      const prevTP = (points[j - 1].high + points[j - 1].low + points[j - 1].close) / 3;
      const rawMoneyFlow = curTP * points[j].volume;
      if (curTP > prevTP) posFlow += rawMoneyFlow;
      else if (curTP < prevTP) negFlow += rawMoneyFlow;
    }

    if (negFlow === 0) {
      points[i].mfi = 100;
    } else {
      const moneyRatio = posFlow / negFlow;
      points[i].mfi = Number((100 - 100 / (1 + moneyRatio)).toFixed(1));
    }
  }

  // 6. MACD (12, 26, 9)
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  const k9 = 2 / (9 + 1);

  let ema12 = points[0].close;
  let ema26 = points[0].close;
  let macdLine = 0;
  let signalLine = 0;

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      points[i].macd = 0;
      points[i].macdSignal = 0;
      points[i].macdHist = 0;
      continue;
    }

    ema12 = points[i].close * k12 + ema12 * (1 - k12);
    ema26 = points[i].close * k26 + ema26 * (1 - k26);
    macdLine = ema12 - ema26;
    signalLine = macdLine * k9 + signalLine * (1 - k9);

    points[i].macd = Number(macdLine.toFixed(3));
    points[i].macdSignal = Number(signalLine.toFixed(3));
    points[i].macdHist = Number((macdLine - signalLine).toFixed(3));
  }

  // 7. Heikin-Ashi Candles
  for (let i = 0; i < n; i++) {
    const pt = points[i];
    const haClose = (pt.open + pt.high + pt.low + pt.close) / 4;
    let haOpen = pt.open;

    if (i > 0 && points[i - 1].haOpen !== undefined && points[i - 1].haClose !== undefined) {
      haOpen = (points[i - 1].haOpen! + points[i - 1].haClose!) / 2;
    }

    const haHigh = Math.max(pt.high, haOpen, haClose);
    const haLow = Math.min(pt.low, haOpen, haClose);

    pt.haOpen = Number(haOpen.toFixed(2));
    pt.haHigh = Number(haHigh.toFixed(2));
    pt.haLow = Number(haLow.toFixed(2));
    pt.haClose = Number(haClose.toFixed(2));
  }

  return points;
}
