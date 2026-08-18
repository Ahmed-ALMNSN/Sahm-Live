import { ChartDataPoint, StockQuote, StockItem } from '../types.js';

export function getClientFallbackChart(
  stock: StockItem | StockQuote,
  range: string = '1D'
): ChartDataPoint[] {
  const currentPrice = Number(stock.price || 100);
  const prevClose = Number(stock.previousClose || currentPrice * 0.98);
  const dayOpen = Number(stock.open || prevClose);
  const highVal = 'dayHigh' in stock ? stock.dayHigh : stock.high;
  const lowVal = 'dayLow' in stock ? stock.dayLow : stock.low;
  const dayHigh = Number(highVal || Math.max(currentPrice, prevClose) * 1.015);
  const dayLow = Number(lowVal || Math.min(currentPrice, prevClose) * 0.985);
  const totalVol = Number(stock.volume || 1000000);

  const cleanRange = (range || '1D').toUpperCase();
  let numPoints = 78;
  let timeStepMs = 5 * 60 * 1000;
  let startPrice = dayOpen;
  let endPrice = currentPrice;
  let maxPrice = dayHigh;
  let minPrice = dayLow;

  const now = Date.now();

  switch (cleanRange) {
    case '1D':
      numPoints = 78;
      timeStepMs = 5 * 60 * 1000;
      startPrice = dayOpen;
      endPrice = currentPrice;
      maxPrice = Math.max(dayHigh, currentPrice, dayOpen);
      minPrice = Math.min(dayLow, currentPrice, dayOpen);
      break;
    case '5D':
      numPoints = 65;
      timeStepMs = 30 * 60 * 1000;
      startPrice = prevClose * 0.98;
      endPrice = currentPrice;
      maxPrice = Math.max(currentPrice, startPrice) * 1.04;
      minPrice = Math.min(currentPrice, startPrice) * 0.96;
      break;
    case '1M':
    case '1MO':
      numPoints = 30;
      timeStepMs = 24 * 60 * 60 * 1000;
      startPrice = currentPrice * 0.95;
      endPrice = currentPrice;
      maxPrice = Math.max(currentPrice, startPrice) * 1.08;
      minPrice = Math.min(currentPrice, startPrice) * 0.92;
      break;
    case '3M':
    case '3MO':
      numPoints = 65;
      timeStepMs = 24 * 60 * 60 * 1000;
      startPrice = currentPrice * 0.92;
      endPrice = currentPrice;
      maxPrice = Math.max(currentPrice, startPrice) * 1.15;
      minPrice = Math.min(currentPrice, startPrice) * 0.85;
      break;
    case '6M':
    case '6MO':
      numPoints = 130;
      timeStepMs = 24 * 60 * 60 * 1000;
      startPrice = currentPrice * 0.88;
      endPrice = currentPrice;
      maxPrice = Math.max(currentPrice, startPrice) * 1.25;
      minPrice = Math.min(currentPrice, startPrice) * 0.78;
      break;
    case '1Y':
    case '12M':
      numPoints = 250;
      timeStepMs = 24 * 60 * 60 * 1000;
      startPrice = Number(stock.fiftyTwoWeekLow || currentPrice * 0.80);
      maxPrice = Number(stock.fiftyTwoWeekHigh || currentPrice * 1.30);
      minPrice = Number(stock.fiftyTwoWeekLow || currentPrice * 0.75);
      endPrice = currentPrice;
      break;
    default:
      numPoints = 30;
      timeStepMs = 24 * 60 * 60 * 1000;
      startPrice = prevClose;
      endPrice = currentPrice;
      break;
  }

  let seed = 0;
  for (let i = 0; i < (stock.symbol || 'SYM').length; i++) {
    seed = (seed << 5) - seed + (stock.symbol || 'SYM').charCodeAt(i);
    seed |= 0;
  }
  const pseudoRand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const startTime = now - numPoints * timeStepMs;
  let runningPrice = startPrice;
  let cumVolume = 0;
  let cumVolPrice = 0;
  const points: ChartDataPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const targetTrendPrice = startPrice + (endPrice - startPrice) * progress;
    const wave = Math.sin(progress * Math.PI * 3 + (seed % 10)) * ((maxPrice - minPrice) * 0.12);
    const noise = (pseudoRand() - 0.49) * ((maxPrice - minPrice) * 0.04);

    let closePrice = targetTrendPrice + wave + noise;
    if (i === numPoints - 1) {
      closePrice = endPrice;
    }

    closePrice = Math.max(minPrice * 0.98, Math.min(maxPrice * 1.02, closePrice));
    const spread = Math.abs(closePrice) * 0.006;
    const barHigh = Number((Math.max(runningPrice, closePrice) + spread * pseudoRand()).toFixed(2));
    const barLow = Number((Math.min(runningPrice, closePrice) - spread * pseudoRand()).toFixed(2));
    const barOpen = Number(runningPrice.toFixed(2));
    const barClose = Number(closePrice.toFixed(2));

    let volWeight = 1.0;
    if (cleanRange === '1D') {
      const uShape = Math.pow(progress - 0.5, 2) * 4;
      volWeight = 0.5 + uShape * 1.5;
    }
    const barVol = Math.round((totalVol / numPoints) * volWeight * (0.7 + pseudoRand() * 0.6));

    const ts = startTime + i * timeStepMs;
    const d = new Date(ts);
    const dateStr = (cleanRange === '1D' || cleanRange === '5D')
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });

    cumVolume += barVol;
    const typicalPrice = (barHigh + barLow + barClose) / 3;
    cumVolPrice += typicalPrice * barVol;
    const vwap = cumVolume > 0 ? Number((cumVolPrice / cumVolume).toFixed(2)) : barClose;

    points.push({
      timestamp: ts,
      date: dateStr,
      open: barOpen,
      high: Math.max(barHigh, barOpen, barClose),
      low: Math.min(barLow, barOpen, barClose),
      close: barClose,
      volume: barVol,
      vwap,
    });

    runningPrice = barClose;
  }

  // Compute SMA 20 & SMA 50
  for (let i = 0; i < points.length; i++) {
    if (i >= 19) {
      const slice20 = points.slice(i - 19, i + 1);
      const sum20 = slice20.reduce((acc, p) => acc + p.close, 0);
      points[i].sma20 = Number((sum20 / 20).toFixed(2));
    } else {
      const sliceSoFar = points.slice(0, i + 1);
      points[i].sma20 = Number((sliceSoFar.reduce((acc, p) => acc + p.close, 0) / (i + 1)).toFixed(2));
    }

    if (i >= 49) {
      const slice50 = points.slice(i - 49, i + 1);
      const sum50 = slice50.reduce((acc, p) => acc + p.close, 0);
      points[i].sma50 = Number((sum50 / 50).toFixed(2));
    } else {
      const sliceSoFar = points.slice(0, i + 1);
      points[i].sma50 = Number((sliceSoFar.reduce((acc, p) => acc + p.close, 0) / (i + 1)).toFixed(2));
    }
  }

  return points;
}
