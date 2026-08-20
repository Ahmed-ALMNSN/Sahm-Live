import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Clock,
  Radio,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  HelpCircle,
  Eye,
  EyeOff,
  Layers,
  ChevronDown
} from 'lucide-react';
import { ChartDataPoint, Language, Theme } from '../types.js';
import {
  computeMarketSessionState,
  MarketSessionState,
} from '../utils/marketSessionEngine.js';
import { ChartControlToolbar } from './ChartControlToolbar.js';

export interface MarketSessionIndicatorChartProps {
  symbol: string;
  companyName?: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  dayOpen?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  avgVolume?: number;
  marketCap?: string | number;
  peRatio?: number;
  week52High?: number;
  week52Low?: number;
  lang?: Language;
  theme?: Theme;
  data?: ChartDataPoint[];
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  isLive?: boolean;
}

export interface CandlePoint {
  index: number;
  open: number;
  high: number;
  low: number;
  close: number;
  price: number; // close alias
  volume: number;
  isUp: boolean;
  timeLabelAr: string;
  timeLabelEn: string;
  fullDateAr: string;
  fullDateEn: string;
}

/**
 * Builds realistic market candlestick data according to the selected timeframe
 */
function buildRealisticTimeframeCandles(
  timeframe: string,
  openPrice: number,
  currentPrice: number,
  highPrice: number,
  lowPrice: number,
  prevClose: number,
  symbol: string
): { candles: CandlePoint[]; highPt: CandlePoint; lowPt: CandlePoint; openPt: CandlePoint; currentPt: CandlePoint; ticks: { labelAr: string; labelEn: string; index: number }[] } {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed << 5) - seed + symbol.charCodeAt(i);
    seed |= 0;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return (seed >>> 0) / 4294967296;
  };

  const normalRand = () => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  const tf = timeframe.toLowerCase();
  let numCandles = 36; // Ideal count for clear, wide, realistic candles
  let tfType: 'intraday' | '5d' | '1m_month' | '1y' = 'intraday';

  if (tf === '1m') numCandles = 40;
  else if (tf === '2m') numCandles = 38;
  else if (tf === '5m') numCandles = 36;
  else if (tf === '15m') numCandles = 26;
  else if (tf === '30m') numCandles = 18;
  else if (tf === '1h') numCandles = 12;
  else if (tf === '1d') numCandles = 34;
  else if (tf === '5d') { numCandles = 30; tfType = '5d'; }
  else if (tf === '1m' || tf === 'month' || tf === '30d') { numCandles = 25; tfType = '1m_month'; }
  else if (tf === '1y') { numCandles = 32; tfType = '1y'; }

  // Price movement trajectory
  const spread = Math.max(0.12, highPrice - lowPrice);
  const peakIndex = Math.min(numCandles - 4, Math.max(4, Math.floor(numCandles * 0.28)));
  const troughIndex = Math.min(numCandles - 2, Math.max(peakIndex + 4, Math.floor(numCandles * 0.72)));

  const rawPrices: number[] = [openPrice];
  let curr = openPrice;

  for (let i = 1; i < numCandles; i++) {
    let target = openPrice;
    if (i <= peakIndex) {
      const p = i / peakIndex;
      target = openPrice + (highPrice - openPrice) * Math.sin(p * (Math.PI / 2));
    } else if (i <= troughIndex) {
      const p = (i - peakIndex) / (troughIndex - peakIndex);
      target = highPrice - (highPrice - lowPrice * 1.02) * Math.sin(p * (Math.PI / 2));
    } else {
      const p = (i - troughIndex) / (numCandles - 1 - troughIndex);
      target = (lowPrice * 1.02) + (currentPrice - (lowPrice * 1.02)) * p;
    }

    const noise = spread * 0.08 * normalRand();
    curr = curr + (target - curr) * 0.35 + noise;
    curr = Math.max(lowPrice, Math.min(highPrice, curr));
    rawPrices.push(curr);
  }

  rawPrices[0] = openPrice;
  rawPrices[numCandles - 1] = currentPrice;
  rawPrices[peakIndex] = highPrice;
  rawPrices[troughIndex] = lowPrice;

  const candles: CandlePoint[] = [];
  let prevC = prevClose || (openPrice * 0.99);

  for (let i = 0; i < numCandles; i++) {
    const cClose = i === numCandles - 1 ? currentPrice : Number(rawPrices[i].toFixed(2));
    const cOpen = i === 0 ? openPrice : Number(prevC.toFixed(2));

    // Realistic candlestick dynamics (wicks & bodies)
    const bodySpread = Math.max(0.01, Math.abs(cClose - cOpen));
    const wickFactor = spread * 0.06;
    const upperWick = Math.abs(normalRand()) * wickFactor;
    const lowerWick = Math.abs(normalRand()) * wickFactor;

    let cHigh = Number((Math.max(cOpen, cClose) + upperWick).toFixed(2));
    let cLow = Number((Math.min(cOpen, cClose) - lowerWick).toFixed(2));

    if (i === peakIndex) cHigh = highPrice;
    if (i === troughIndex) cLow = lowPrice;

    cHigh = Math.max(cHigh, cOpen, cClose);
    cLow = Math.min(cLow, cOpen, cClose);

    const isUp = cClose >= cOpen;
    const isSpecial = i === peakIndex || i === troughIndex || i < 3;
    const volBase = isSpecial ? 45000 : 12000;
    const volume = Math.round(volBase + Math.abs(normalRand()) * 18000);

    // Dynamic Time and Date Labels based on Timeframe
    let timeLabelAr = '';
    let timeLabelEn = '';
    let fullDateAr = '';
    let fullDateEn = '';

    if (tfType === 'intraday') {
      const totalMins = 570 + Math.round((i / (numCandles - 1)) * 390); // 09:30 AM = 570 to 16:00 PM
      const h24 = Math.floor(totalMins / 60);
      const mVal = totalMins % 60;
      const isPm = h24 >= 12;
      const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
      const mStr = mVal < 10 ? `0${mVal}` : `${mVal}`;
      const hStr = h12 < 10 ? `0${h12}` : `${h12}`;

      timeLabelAr = `${hStr}:${mStr} ${isPm ? 'م' : 'ص'}`;
      timeLabelEn = `${hStr}:${mStr} ${isPm ? 'PM' : 'AM'}`;
      fullDateAr = `20 أغسطس، ${timeLabelAr}`;
      fullDateEn = `Aug 20, ${timeLabelEn}`;
    } else if (tfType === '5d') {
      const dayNamesAr = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      const dayNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const dayIdx = Math.min(4, Math.floor((i / numCandles) * 5));
      const hour = 10 + (i % 6);

      timeLabelAr = `${dayNamesAr[dayIdx]}`;
      timeLabelEn = `${dayNamesEn[dayIdx]}`;
      fullDateAr = `${dayNamesAr[dayIdx]}، ${hour}:00 م`;
      fullDateEn = `${dayNamesEn[dayIdx]}, ${hour}:00 PM`;
    } else if (tfType === '1m_month') {
      const dayNum = 1 + Math.floor((i / numCandles) * 28);
      timeLabelAr = `${dayNum} أغسطس`;
      timeLabelEn = `Aug ${dayNum}`;
      fullDateAr = `${dayNum} أغسطس 2026`;
      fullDateEn = `Aug ${dayNum}, 2026`;
    } else {
      // 1Y
      const monthsAr = ['سبتمبر', 'نوفمبر', 'يناير', 'مارس', 'مايو', 'يوليو'];
      const monthsEn = ['Sep', 'Nov', 'Jan', 'Mar', 'May', 'Jul'];
      const mIdx = Math.min(5, Math.floor((i / numCandles) * 6));
      timeLabelAr = monthsAr[mIdx];
      timeLabelEn = monthsEn[mIdx];
      fullDateAr = `${monthsAr[mIdx]} 2026`;
      fullDateEn = `${monthsEn[mIdx]} 2026`;
    }

    candles.push({
      index: i,
      open: cOpen,
      high: cHigh,
      low: cLow,
      close: cClose,
      price: cClose,
      volume,
      isUp,
      timeLabelAr,
      timeLabelEn,
      fullDateAr,
      fullDateEn,
    });

    prevC = cClose;
  }

  // Ticks along bottom axis
  const ticks: { labelAr: string; labelEn: string; index: number }[] = [];
  const tickCount = Math.min(7, Math.max(4, Math.floor(numCandles / 5)));
  for (let t = 0; t <= tickCount; t++) {
    const idx = Math.min(numCandles - 1, Math.round((t / tickCount) * (numCandles - 1)));
    ticks.push({
      labelAr: candles[idx].timeLabelAr,
      labelEn: candles[idx].timeLabelEn,
      index: idx,
    });
  }

  const openPt = candles[0];
  const highPt = candles[peakIndex];
  const lowPt = candles[troughIndex];
  const currentPt = candles[candles.length - 1];

  return { candles, highPt, lowPt, openPt, currentPt, ticks };
}

export const MarketSessionIndicatorChart: React.FC<MarketSessionIndicatorChartProps> = ({
  symbol,
  companyName,
  currentPrice: propCurrentPrice,
  change: propChange,
  changePercent: propChangePercent,
  previousClose: propPrevClose,
  dayOpen: propOpen,
  dayHigh: propHigh,
  dayLow: propLow,
  volume,
  lang = 'ar',
  theme,
  isLive = true,
  selectedRange = '1D',
  onRangeChange,
}) => {
  const isAr = lang === 'ar';

  // Toolbar & Style State
  const [chartType, setChartType] = useState<'candlestick' | 'area' | 'line' | 'bars' | 'heikinAshi'>('candlestick');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(selectedRange || '1D');
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showVwap, setShowVwap] = useState<boolean>(true);
  const [subIndicator, setSubIndicator] = useState<'volume' | 'rsi' | 'macd' | 'mfi' | 'none'>('volume');

  // Live Micro-movement Simulation
  const [liveJitter, setLiveJitter] = useState(0);
  const [livePulse, setLivePulse] = useState(1);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.49) * (propCurrentPrice * 0.0008);
      setLiveJitter(Number(delta.toFixed(3)));
      setLivePulse((prev) => (prev === 1 ? 1.25 : 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [isLive, propCurrentPrice]);

  const currentPrice = Number((propCurrentPrice + liveJitter).toFixed(2));
  const change = Number((propChange + liveJitter).toFixed(2));
  const changePercent = propPrevClose && propPrevClose > 0 
    ? Number(((change / propPrevClose) * 100).toFixed(2)) 
    : propChangePercent;

  // Base pricing logic
  const effectiveOpen = propOpen && propOpen > 0 ? propOpen : Number((currentPrice - change).toFixed(2));
  const effectivePrevClose = propPrevClose && propPrevClose > 0
    ? propPrevClose
    : (effectiveOpen || Number((currentPrice * (1 - (changePercent || 0) / 100)).toFixed(2)));
  const effectiveHigh = Math.max(propHigh || currentPrice, currentPrice, effectiveOpen);
  const effectiveLow = Math.min(propLow || currentPrice, currentPrice, effectiveOpen);

  // Market session state
  const [marketSession, setMarketSession] = useState<MarketSessionState>(() => computeMarketSessionState());
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketSession(computeMarketSessionState());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme resolution
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('light');
  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
      return;
    }
    const checkDark = () => {
      setActiveTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [theme]);

  const isDarkMode = activeTheme === 'dark';

  // Interactive Tools State
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [hoverPoint, setHoverPoint] = useState<CandlePoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Generate Realistic Candles & Dynamic Ticks for the active timeframe
  const { candles, highPt, lowPt, openPt, currentPt, ticks } = useMemo(() => {
    return buildRealisticTimeframeCandles(
      selectedTimeframe,
      effectiveOpen,
      currentPrice,
      effectiveHigh,
      effectiveLow,
      effectivePrevClose,
      symbol
    );
  }, [selectedTimeframe, effectiveOpen, currentPrice, effectiveHigh, effectiveLow, effectivePrevClose, symbol]);

  // Dimension tracking with ResizeObserver
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 980, height: 430 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 980;
        const h = Math.max(340, Math.min(500, containerRef.current.clientHeight || 430));
        setDimensions({ width: w, height: h });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Coordinate Systems
  const padding = { top: 40, right: 180, bottom: 45, left: 55 };
  const graphWidth = Math.max(200, (dimensions.width - padding.left - padding.right) * zoomLevel);
  const graphHeight = Math.max(120, dimensions.height - padding.top - padding.bottom);
  const subIndicatorHeight = subIndicator !== 'none' ? 45 : 0;
  const subIndicatorTop = padding.top + graphHeight - subIndicatorHeight;

  // Price Range calculations (Y-Axis)
  const { minScale, maxScale, priceLevels, maxVolume } = useMemo(() => {
    const span = Math.max(0.2, effectiveHigh - effectiveLow);
    const paddedMin = Math.max(0, effectiveLow - span * 0.15);
    const paddedMax = effectiveHigh + span * 0.18;

    const count = 9;
    const step = (paddedMax - paddedMin) / count;
    const levels: number[] = [];
    for (let i = count; i >= 0; i--) {
      levels.push(Number((paddedMin + step * i).toFixed(2)));
    }

    let maxVol = 1000;
    candles.forEach((p) => {
      if (p.volume > maxVol) maxVol = p.volume;
    });

    return {
      minScale: paddedMin,
      maxScale: paddedMax,
      priceLevels: levels,
      maxVolume: maxVol,
    };
  }, [effectiveHigh, effectiveLow, candles]);

  // Coordinate mapping functions
  const getX = useCallback(
    (index: number) => {
      const count = Math.max(1, candles.length - 1);
      return padding.left + panOffset + (index / count) * graphWidth;
    },
    [padding.left, panOffset, graphWidth, candles.length]
  );

  const getY = useCallback(
    (price: number) => {
      const range = maxScale - minScale || 1;
      const normalized = (price - minScale) / range;
      return padding.top + (1 - normalized) * (graphHeight - 15);
    },
    [minScale, maxScale, padding.top, graphHeight]
  );

  // Compute Technical Overlays (EMA20, VWAP, Bollinger Bands)
  const { ema20Path, vwapPath, bbUpperPath, bbLowerPath, bbAreaPath } = useMemo(() => {
    if (candles.length === 0) {
      return { ema20Path: '', vwapPath: '', bbUpperPath: '', bbLowerPath: '', bbAreaPath: '' };
    }

    const k = 2 / (20 + 1);
    let ema = candles[0].close;
    let emaD = '';

    let cumVol = 0;
    let cumVolPrice = 0;
    let vwapD = '';

    const bbPointsUpper: { x: number; y: number }[] = [];
    const bbPointsLower: { x: number; y: number }[] = [];

    candles.forEach((pt, idx) => {
      const x = getX(pt.index);

      // EMA20
      ema = pt.close * k + ema * (1 - k);
      const emaY = getY(ema);
      emaD += idx === 0 ? `M ${x.toFixed(1)} ${emaY.toFixed(1)}` : ` L ${x.toFixed(1)} ${emaY.toFixed(1)}`;

      // VWAP
      cumVol += pt.volume;
      cumVolPrice += pt.close * pt.volume;
      const vwapVal = cumVol > 0 ? cumVolPrice / cumVol : pt.close;
      const vwapY = getY(vwapVal);
      vwapD += idx === 0 ? `M ${x.toFixed(1)} ${vwapY.toFixed(1)}` : ` L ${x.toFixed(1)} ${vwapY.toFixed(1)}`;

      // Bollinger Bands
      const windowStart = Math.max(0, idx - 14);
      const sub = candles.slice(windowStart, idx + 1);
      const mean = sub.reduce((acc, curr) => acc + curr.close, 0) / sub.length;
      const variance = sub.reduce((acc, curr) => acc + Math.pow(curr.close - mean, 2), 0) / sub.length;
      const stdDev = Math.sqrt(variance);
      const upper = mean + stdDev * 2;
      const lower = mean - stdDev * 2;

      bbPointsUpper.push({ x, y: getY(upper) });
      bbPointsLower.push({ x, y: getY(lower) });
    });

    let bbUpperD = '';
    let bbLowerD = '';
    bbPointsUpper.forEach((p, idx) => {
      bbUpperD += idx === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });
    bbPointsLower.forEach((p, idx) => {
      bbLowerD += idx === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });

    let bbArea = '';
    if (bbPointsUpper.length > 0) {
      bbArea = bbUpperD;
      for (let i = bbPointsLower.length - 1; i >= 0; i--) {
        bbArea += ` L ${bbPointsLower[i].x.toFixed(1)} ${bbPointsLower[i].y.toFixed(1)}`;
      }
      bbArea += ' Z';
    }

    return {
      ema20Path: emaD,
      vwapPath: vwapD,
      bbUpperPath: bbUpperD,
      bbLowerPath: bbLowerD,
      bbAreaPath: bbArea,
    };
  }, [candles, getX, getY]);

  // Construct Area & Line Paths
  const { pathD, areaD } = useMemo(() => {
    if (candles.length === 0) return { pathD: '', areaD: '' };

    let pStr = '';
    candles.forEach((pt, idx) => {
      const x = getX(pt.index);
      const y = getY(pt.close);
      if (idx === 0) {
        pStr += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        pStr += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    });

    const firstX = getX(0);
    const lastX = getX(candles.length - 1);
    const baselineY = getY(effectiveLow);
    const aStr = `${pStr} L ${lastX.toFixed(1)} ${baselineY.toFixed(1)} L ${firstX.toFixed(1)} ${baselineY.toFixed(1)} Z`;

    return { pathD: pStr, areaD: aStr };
  }, [candles, getX, getY, effectiveLow]);

  // Compute Heikin-Ashi Candles
  const heikinAshiPoints = useMemo(() => {
    if (chartType !== 'heikinAshi') return [];
    const ha: { index: number; open: number; high: number; low: number; close: number; isUp: boolean }[] = [];
    let prevOpen = candles[0]?.open || effectiveOpen;
    let prevClose = candles[0]?.close || effectiveOpen;

    candles.forEach((pt) => {
      const haClose = (pt.open + pt.high + pt.low + pt.close) / 4;
      const haOpen = (prevOpen + prevClose) / 2;
      const haHigh = Math.max(pt.high, haOpen, haClose);
      const haLow = Math.min(pt.low, haOpen, haClose);
      const isUp = haClose >= haOpen;

      ha.push({
        index: pt.index,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        isUp,
      });

      prevOpen = haOpen;
      prevClose = haClose;
    });

    return ha;
  }, [candles, chartType, effectiveOpen]);

  // Dynamic Realistic Candle Width calculation (Prominent & bold)
  const candleBarWidth = useMemo(() => {
    if (candles.length === 0) return 10;
    const baseWidth = (graphWidth / candles.length) * 0.74;
    return Math.max(7, Math.min(18, baseWidth));
  }, [graphWidth, candles.length]);

  // Compute RSI curve for sub-indicator
  const rsiPath = useMemo(() => {
    if (subIndicator !== 'rsi' || candles.length < 10) return '';
    let gains = 0;
    let losses = 0;

    const period = Math.min(14, Math.floor(candles.length / 2));
    for (let i = 1; i <= period; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let d = '';

    for (let i = period; i < candles.length; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - diff) / period;
      }

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      const x = getX(candles[i].index);
      const y = subIndicatorTop + (1 - rsi / 100) * subIndicatorHeight;
      d += d === '' ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    return d;
  }, [candles, subIndicator, getX, subIndicatorTop, subIndicatorHeight]);

  const tealColor = '#0D9488';
  const currentPriceY = getY(currentPrice);
  const openPriceY = getY(effectiveOpen);
  const highPriceY = getY(highPt.high || highPt.close);
  const lowPriceY = getY(lowPt.low || lowPt.close);

  const startSessionX = getX(0);
  const currentSessionX = getX(currentPt.index);
  const scaleCardLeft = dimensions.width - 150;
  const scaleCardWidth = 56;
  const scaleCardTop = padding.top - 10;
  const scaleCardHeight = graphHeight + 15;

  // Track Mouse Movement for Interactive Crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: mouseX, y: mouseY });

    let closestPt: CandlePoint | null = null;
    let minDistance = Infinity;

    candles.forEach((pt) => {
      const px = getX(pt.index);
      const dist = Math.abs(px - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestPt = pt;
      }
    });

    if (closestPt && minDistance < 50) {
      setHoverPoint(closestPt);
    } else {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverPoint(null);
    setMousePos(null);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.75, Number((prev - 0.25).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset(0);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Active target point
  const activePt = hoverPoint || currentPt;
  const activePrice = activePt.close;
  const activePriceY = getY(activePrice);
  const activeX = getX(activePt.index);

  const handleTimeframeSelect = (tf: string) => {
    setSelectedTimeframe(tf);
    onRangeChange?.(tf);
  };

  return (
    <div
      id={`exact-reference-indicator-${symbol.toLowerCase()}`}
      dir="ltr"
      onWheel={handleWheel}
      className="w-full bg-[#FCFDFE] dark:bg-[#0A0D14] text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden font-sans transition-colors relative select-none"
      style={{
        backgroundImage: isDarkMode
          ? 'linear-gradient(to right, rgba(30, 41, 59, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.35) 1px, transparent 1px)'
          : 'linear-gradient(to right, rgba(241, 245, 249, 0.85) 1px, transparent 1px), linear-gradient(to bottom, rgba(241, 245, 249, 0.85) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* ======================= TOP ROW: INTEGRATED CONTROL TOOLBAR ======================= */}
      <div className="px-3 pt-3 pb-1 border-b border-slate-100 dark:border-slate-850 bg-white/80 dark:bg-[#0A0D14]/80">
        <ChartControlToolbar
          subIndicator={subIndicator}
          onSubIndicatorChange={(ind) => setSubIndicator(ind)}
          showBollinger={showBollinger}
          onToggleBollinger={() => setShowBollinger(!showBollinger)}
          showEma20={showEma20}
          onToggleEma20={() => setShowEma20(!showEma20)}
          showVwap={showVwap}
          onToggleVwap={() => setShowVwap(!showVwap)}
          chartType={chartType}
          onChartTypeChange={(type) => setChartType(type)}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={handleTimeframeSelect}
          lang={lang}
          className="border-0 shadow-none bg-transparent !p-0"
        />
      </div>

      {/* ======================= SECOND ROW: INTERACTIVE CONTROLS BAR ======================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c101a]/80 backdrop-blur-sm text-xs">
        {/* Left: Interactive Tools & Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleZoomIn}
              title={isAr ? 'تكبير المؤشر' : 'Zoom In'}
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              title={isAr ? 'تصغير المؤشر' : 'Zoom Out'}
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {zoomLevel !== 1.0 && (
              <button
                type="button"
                onClick={handleResetZoom}
                title={isAr ? 'إعادة الضبط' : 'Reset View'}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer border-l border-slate-200 dark:border-slate-700 ml-0.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Explanations / Annotation Button */}
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
              showExplanation
                ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {showExplanation ? <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isAr ? 'الشرح على الرسم' : 'Chart Annotations'}</span>
          </button>
        </div>

        {/* Right: Live Ticker & Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
            <span>{isAr ? `بث حي (${selectedTimeframe})` : `Live (${selectedTimeframe})`}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>O: <strong className="text-slate-800 dark:text-slate-200">${effectiveOpen.toFixed(2)}</strong></span>
            <span>H: <strong className="text-slate-800 dark:text-slate-200">${effectiveHigh.toFixed(2)}</strong></span>
            <span>L: <strong className="text-slate-800 dark:text-slate-200">${effectiveLow.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* ======================= CHART SVG CANVAS ======================= */}
      <div ref={containerRef} className="relative w-full h-88 sm:h-96 p-2 select-none overflow-hidden">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible cursor-crosshair"
        >
          <defs>
            <linearGradient id="referenceTealGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity={isDarkMode ? 0.22 : 0.14} />
              <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
            </linearGradient>

            <filter id="leverGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ================= BACKGROUND GRID LINES ================= */}
          <line
            x1={padding.left}
            y1={highPriceY}
            x2={padding.left + graphWidth}
            y2={highPriceY}
            stroke={isDarkMode ? 'rgba(148, 163, 184, 0.25)' : 'rgba(203, 213, 225, 0.65)'}
            strokeDasharray="3,4"
            strokeWidth="1.2"
          />

          <line
            x1={padding.left}
            y1={openPriceY}
            x2={currentSessionX}
            y2={openPriceY}
            stroke={isDarkMode ? 'rgba(13, 148, 136, 0.5)' : 'rgba(13, 148, 136, 0.4)'}
            strokeDasharray="3,3"
            strokeWidth="1.2"
          />

          <line
            x1={padding.left}
            y1={lowPriceY}
            x2={currentSessionX}
            y2={lowPriceY}
            stroke={isDarkMode ? 'rgba(148, 163, 184, 0.25)' : 'rgba(203, 213, 225, 0.65)'}
            strokeDasharray="3,4"
            strokeWidth="1.2"
          />

          <line
            x1={startSessionX}
            y1={padding.top - 5}
            x2={startSessionX}
            y2={padding.top + graphHeight}
            stroke={isDarkMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.55)'}
            strokeDasharray="3,4"
            strokeWidth="1.5"
          />

          {/* ================= SUB-INDICATOR SECTION (VOLUME / RSI) ================= */}
          {subIndicator === 'volume' && (
            <g id="reference-volume-histogram">
              <text
                x={padding.left - 10}
                y={subIndicatorTop - 6}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fontFamily="sans-serif"
                fill={isDarkMode ? '#94A3B8' : '#64748B'}
              >
                {isAr ? 'حجم التداول' : 'Volume'}
              </text>
              {candles.map((pt, i) => {
                const x = getX(pt.index);
                const barHeight = Math.max(2, (pt.volume / maxVolume) * subIndicatorHeight);
                const barY = padding.top + graphHeight - barHeight;
                const barColor = pt.isUp
                  ? isDarkMode ? '#10B981' : '#10B981'
                  : isDarkMode ? '#F43F5E' : '#EF4444';

                return (
                  <rect
                    key={`vol-${i}`}
                    x={x - candleBarWidth / 2}
                    y={barY}
                    width={candleBarWidth}
                    height={barHeight}
                    fill={barColor}
                    opacity={isDarkMode ? 0.75 : 0.8}
                    rx="1"
                  />
                );
              })}
            </g>
          )}

          {subIndicator === 'rsi' && (
            <g id="reference-rsi-indicator">
              <text
                x={padding.left - 10}
                y={subIndicatorTop - 6}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fontFamily="sans-serif"
                fill="#8B5CF6"
              >
                RSI (14)
              </text>
              <line
                x1={padding.left}
                y1={subIndicatorTop + subIndicatorHeight * 0.3}
                x2={padding.left + graphWidth}
                y2={subIndicatorTop + subIndicatorHeight * 0.3}
                stroke="#A78BFA"
                strokeDasharray="2,2"
                strokeWidth="0.8"
                opacity="0.5"
              />
              <line
                x1={padding.left}
                y1={subIndicatorTop + subIndicatorHeight * 0.7}
                x2={padding.left + graphWidth}
                y2={subIndicatorTop + subIndicatorHeight * 0.7}
                stroke="#A78BFA"
                strokeDasharray="2,2"
                strokeWidth="0.8"
                opacity="0.5"
              />
              {rsiPath && (
                <path d={rsiPath} fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </g>
          )}

          {/* ================= BOLLINGER BANDS OVERLAY ================= */}
          {showBollinger && (
            <g id="bollinger-bands-layer">
              {bbAreaPath && <path d={bbAreaPath} fill="rgba(56, 189, 248, 0.08)" />}
              {bbUpperPath && <path d={bbUpperPath} fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3,3" />}
              {bbLowerPath && <path d={bbLowerPath} fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3,3" />}
            </g>
          )}

          {/* ================= VWAP OVERLAY ================= */}
          {showVwap && vwapPath && (
            <path
              id="vwap-indicator-line"
              d={vwapPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="1.6"
              strokeDasharray="4,2"
              opacity="0.85"
            />
          )}

          {/* ================= EMA20 OVERLAY ================= */}
          {showEma20 && ema20Path && (
            <path
              id="ema20-indicator-line"
              d={ema20Path}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.8"
              opacity="0.9"
            />
          )}

          {/* ================= DRAW PRIMARY CHART TYPE ================= */}
          {/* 1. AREA CHART */}
          {chartType === 'area' && (
            <g id="area-chart-view">
              {areaD && <path d={areaD} fill="url(#referenceTealGradient)" />}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={tealColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )}

          {/* 2. LINE CHART */}
          {chartType === 'line' && (
            <g id="line-chart-view">
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={tealColor}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )}

          {/* 3. CANDLESTICK CHART - BIG, CLEAR & REALISTIC CANDLES */}
          {chartType === 'candlestick' && (
            <g id="candlestick-chart-view">
              {candles.map((pt, i) => {
                const x = getX(pt.index);
                const isGreen = pt.close >= pt.open;
                const candleColor = isGreen ? '#10B981' : '#EF4444';
                const strokeColor = isGreen ? '#059669' : '#DC2626';

                const yHigh = getY(pt.high);
                const yLow = getY(pt.low);
                const yTop = getY(Math.max(pt.open, pt.close));
                const yBottom = getY(Math.min(pt.open, pt.close));
                const bodyHeight = Math.max(3, yBottom - yTop);

                return (
                  <g key={`candle-${i}`} className="transition-transform duration-150 hover:opacity-90">
                    {/* Realistic Upper and Lower Wicks */}
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={candleColor}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    {/* Realistic Bold Solid Candle Body */}
                    <rect
                      x={x - candleBarWidth / 2}
                      y={yTop}
                      width={candleBarWidth}
                      height={bodyHeight}
                      fill={candleColor}
                      stroke={strokeColor}
                      strokeWidth="1"
                      rx="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* 4. HEIKIN-ASHI CHART */}
          {chartType === 'heikinAshi' && (
            <g id="heikin-ashi-chart-view">
              {heikinAshiPoints.map((pt, i) => {
                const x = getX(pt.index);
                const candleColor = pt.isUp ? '#10B981' : '#EF4444';
                const strokeColor = pt.isUp ? '#059669' : '#DC2626';

                const yHigh = getY(pt.high);
                const yLow = getY(pt.low);
                const yTop = getY(Math.max(pt.open, pt.close));
                const yBottom = getY(Math.min(pt.open, pt.close));
                const bodyHeight = Math.max(3, yBottom - yTop);

                return (
                  <g key={`ha-${i}`}>
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={candleColor}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <rect
                      x={x - candleBarWidth / 2}
                      y={yTop}
                      width={candleBarWidth}
                      height={bodyHeight}
                      fill={candleColor}
                      stroke={strokeColor}
                      strokeWidth="1"
                      rx="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* ================= CALLOUT POINTS & ANNOTATIONS ================= */}
          {showExplanation && (
            <g id="chart-explanations-layer" className="transition-opacity duration-300">
              {/* 1. بداية الجلسة (Session Open Dot & Text) */}
              <g id="callout-session-open">
                <circle
                  cx={startSessionX}
                  cy={openPriceY}
                  r="4"
                  fill={tealColor}
                />
                <text
                  x={startSessionX - 8}
                  y={openPriceY - 8}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="sans-serif"
                  fill={isDarkMode ? '#CBD5E1' : '#475569'}
                >
                  {isAr ? 'بداية الجلسة' : 'Session Open'}
                </text>
              </g>

              {/* 2. الأعلى (High Point Dot & Text) */}
              <g id="callout-session-high">
                <circle
                  cx={getX(highPt.index)}
                  cy={highPriceY}
                  r="4.5"
                  fill={tealColor}
                />
                <text
                  x={getX(highPt.index) + 5}
                  y={highPriceY - 10}
                  textAnchor="start"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="sans-serif"
                  fill={isDarkMode ? '#F1F5F9' : '#0F172A'}
                >
                  {isAr ? `الأعلى ${highPt.high.toFixed(2)}$` : `High $${highPt.high.toFixed(2)}`}
                </text>
              </g>

              {/* 3. الأدنى (Low Point Dot & Text) */}
              <g id="callout-session-low">
                <circle
                  cx={getX(lowPt.index)}
                  cy={lowPriceY}
                  r="4.5"
                  fill={tealColor}
                />
                <text
                  x={getX(lowPt.index) + 5}
                  y={lowPriceY + 16}
                  textAnchor="start"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="sans-serif"
                  fill={isDarkMode ? '#F1F5F9' : '#0F172A'}
                >
                  {isAr ? `الأدنى ${lowPt.low.toFixed(2)}$` : `Low $${lowPt.low.toFixed(2)}`}
                </text>
              </g>
            </g>
          )}

          {/* ================= LIVE PULSING CURRENT PRICE BEACON ================= */}
          <g id="callout-current-price-beacon">
            <circle
              cx={currentSessionX}
              cy={currentPriceY}
              r={7 * livePulse}
              fill="none"
              stroke={tealColor}
              strokeWidth="1.5"
              opacity={0.6}
              className="transition-all duration-700"
            />
            <circle
              cx={currentSessionX}
              cy={currentPriceY}
              r="6.5"
              fill={isDarkMode ? '#0A0D14' : '#FFFFFF'}
              stroke={tealColor}
              strokeWidth="2.8"
            />
          </g>

          {/* ================= MOVING LEVER CROSSHAIR & TOOLTIP ================= */}
          {hoverPoint && (
            <g id="interactive-moving-lever">
              <line
                x1={activeX}
                y1={padding.top - 10}
                x2={activeX}
                y2={padding.top + graphHeight}
                stroke={isDarkMode ? '#2DD4BF' : '#0D9488'}
                strokeDasharray="2,2"
                strokeWidth="1.5"
                filter="url(#leverGlow)"
              />

              <line
                x1={padding.left}
                y1={activePriceY}
                x2={scaleCardLeft + scaleCardWidth}
                y2={activePriceY}
                stroke={isDarkMode ? '#2DD4BF' : '#0D9488'}
                strokeDasharray="2,2"
                strokeWidth="1.5"
              />

              <circle
                cx={activeX}
                cy={activePriceY}
                r="6"
                fill="#0D9488"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="drop-shadow-lg"
              />

              {/* FLOATING HOVER CARD AT CROSSHAIR */}
              <g transform={`translate(${Math.min(dimensions.width - 240, Math.max(padding.left + 10, activeX - 75))}, ${Math.max(10, activePriceY - 110)})`}>
                <rect
                  width="155"
                  height="82"
                  rx="10"
                  fill={isDarkMode ? '#030712' : '#111827'}
                  stroke={isDarkMode ? '#1F2937' : '#374151'}
                  strokeWidth="1"
                  className="drop-shadow-2xl"
                  opacity="0.96"
                />

                <text
                  x="14"
                  y="22"
                  fontSize="12.5"
                  fontWeight="900"
                  fontFamily="'JetBrains Mono', monospace"
                  fill="#FFFFFF"
                >
                  ${activePt.close.toFixed(2)}
                </text>

                <text
                  x="142"
                  y="21"
                  textAnchor="end"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="sans-serif"
                  fill="#9CA3AF"
                >
                  {isAr ? activePt.fullDateAr : activePt.fullDateEn}
                </text>

                <line x1="10" y1="30" x2="145" y2="30" stroke="#374151" strokeWidth="0.8" />

                <text x="14" y="47" fontSize="9" fontWeight="500" fill="#9CA3AF">
                  {isAr ? 'افتتاح' : 'Open'}
                </text>
                <text x="52" y="47" fontSize="9.5" fontWeight="700" fontFamily="mono" fill="#FFFFFF">
                  ${activePt.open.toFixed(2)}
                </text>

                <text x="82" y="47" fontSize="9" fontWeight="500" fill="#9CA3AF">
                  {isAr ? 'أعلى' : 'High'}
                </text>
                <text x="142" y="47" textAnchor="end" fontSize="9.5" fontWeight="700" fontFamily="mono" fill="#FFFFFF">
                  ${activePt.high.toFixed(2)}
                </text>

                <text x="14" y="66" fontSize="9" fontWeight="500" fill="#9CA3AF">
                  {isAr ? 'أدنى' : 'Low'}
                </text>
                <text x="52" y="66" fontSize="9.5" fontWeight="700" fontFamily="mono" fill="#FFFFFF">
                  ${activePt.low.toFixed(2)}
                </text>

                <text x="82" y="66" fontSize="9" fontWeight="500" fill="#9CA3AF">
                  {isAr ? 'الحجم' : 'Vol'}
                </text>
                <text x="142" y="66" textAnchor="end" fontSize="9.5" fontWeight="700" fontFamily="mono" fill="#2DD4BF">
                  {activePt.volume >= 1000 ? `${(activePt.volume / 1000).toFixed(0)}K` : activePt.volume}
                </text>
              </g>
            </g>
          )}

          {/* ================= FLOATING Y-AXIS PRICE SCALE BOX (RIGHT) ================= */}
          <g id="floating-price-scale-card">
            <rect
              x={scaleCardLeft}
              y={scaleCardTop}
              width={scaleCardWidth}
              height={scaleCardHeight}
              rx="12"
              fill={isDarkMode ? '#111827' : '#FFFFFF'}
              stroke={isDarkMode ? '#1E293B' : '#E2E8F0'}
              strokeWidth="1.2"
              className="drop-shadow-sm"
            />

            <line
              x1={scaleCardLeft + 1}
              y1={scaleCardTop + 12}
              x2={scaleCardLeft + 1}
              y2={scaleCardTop + scaleCardHeight - 12}
              stroke="#0D9488"
              strokeDasharray="3,3"
              strokeWidth="1.5"
            />

            {priceLevels.map((p, idx) => {
              const y = getY(p);
              if (y < scaleCardTop + 10 || y > scaleCardTop + scaleCardHeight - 10) return null;

              return (
                <g key={`scale-level-${idx}`}>
                  <line
                    x1={scaleCardLeft + 1}
                    y1={y}
                    x2={scaleCardLeft + 5}
                    y2={y}
                    stroke="#0D9488"
                    strokeWidth="1.2"
                  />
                  <text
                    x={scaleCardLeft + 10}
                    y={y + 3.5}
                    textAnchor="start"
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="'JetBrains Mono', monospace"
                    fill={isDarkMode ? '#E2E8F0' : '#1E293B'}
                  >
                    {p.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ================= CURRENT LIVE PRICE GREEN PILL BADGE ================= */}
          <g id="live-price-green-pill-badge">
            <line
              x1={scaleCardLeft + scaleCardWidth}
              y1={currentPriceY}
              x2={scaleCardLeft + scaleCardWidth + 8}
              y2={currentPriceY}
              stroke="#0D9488"
              strokeDasharray="2,2"
              strokeWidth="1"
            />

            <rect
              x={scaleCardLeft + scaleCardWidth + 8}
              y={currentPriceY - 14}
              width={70}
              height={28}
              rx="8"
              fill="#0D9488"
              className="drop-shadow-md"
            />

            <text
              x={scaleCardLeft + scaleCardWidth + 43}
              y={currentPriceY + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="900"
              fontFamily="'JetBrains Mono', monospace"
              fill="#FFFFFF"
            >
              ${currentPrice.toFixed(2)}
            </text>
          </g>

          {/* Hover Tracker Tag Badge */}
          {hoverPoint && Math.abs(activePriceY - currentPriceY) > 20 && (
            <g id="hover-price-tracker-badge">
              <rect
                x={scaleCardLeft + scaleCardWidth + 8}
                y={activePriceY - 12}
                width={68}
                height={24}
                rx="6"
                fill={isDarkMode ? '#0F172A' : '#1E293B'}
                stroke="#0D9488"
                strokeWidth="1"
                className="drop-shadow-md"
              />
              <text
                x={scaleCardLeft + scaleCardWidth + 42}
                y={activePriceY + 3.5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fontFamily="'JetBrains Mono', monospace"
                fill="#FFFFFF"
              >
                ${activePrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* ================= DYNAMIC TIME AXIS TICKS ================= */}
          <g id="bottom-time-axis">
            {ticks.map((tick, idx) => {
              const x = getX(tick.index);
              return (
                <text
                  key={`time-tick-${idx}`}
                  x={x}
                  y={dimensions.height - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="'JetBrains Mono', sans-serif"
                  fill={isDarkMode ? '#94A3B8' : '#64748B'}
                >
                  {isAr ? tick.labelAr : tick.labelEn}
                </text>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
