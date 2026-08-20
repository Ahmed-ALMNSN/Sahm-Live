import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  UTCTimestamp,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  HistogramSeries
} from 'lightweight-charts';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Radio,
  Sliders,
  Calendar,
  Layers,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Scan
} from 'lucide-react';
import { ChartDataPoint, Language, Theme } from '../types.js';
import {
  calculateAllTechnicalIndicators,
  CalculatedIndicatorDataPoint,
} from '../utils/technicalIndicators.js';
import {
  computeMarketSessionState,
  getNyMarketTime,
  parseTimeframeToMinutes,
  buildLiveSessionTimelineData,
  MarketSessionType,
  MarketStatusType
} from '../utils/marketSessionEngine.js';
import { ChartControlToolbar } from './ChartControlToolbar.js';

export type ChartType = 'candlestick' | 'area' | 'line' | 'bars' | 'heikinAshi';
export type SubIndicatorType = 'volume' | 'rsi' | 'macd' | 'mfi' | 'none';

export interface TradingViewStyleChartProps {
  data?: ChartDataPoint[];
  symbol: string;
  companyName?: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  dayOpen?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  lang?: Language;
  theme?: Theme;
  selectedTimeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  stopLossPrice?: number;
  targetPrice?: number;
  vwapPrice?: number;
  isLive?: boolean;
}

export const TradingViewStyleChart: React.FC<TradingViewStyleChartProps> = ({
  data = [],
  symbol,
  companyName,
  currentPrice,
  change,
  changePercent,
  dayOpen,
  dayHigh,
  dayLow,
  volume,
  lang = 'ar',
  theme,
  selectedTimeframe = '5m',
  onTimeframeChange,
  stopLossPrice,
  targetPrice,
  vwapPrice,
  isLive = true,
}) => {
  const isAr = lang === 'ar';
  const isPositive = change >= 0;

  // Real-time market session state updated every second
  const [marketSession, setMarketSession] = useState(() => computeMarketSessionState());

  // Active theme tracking (respecting prop or DOM root .dark class)
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>(() => {
    if (theme) return theme;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
      return;
    }
    const updateThemeFromDOM = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setActiveTheme(isDark ? 'dark' : 'light');
    };
    updateThemeFromDOM();
    const observer = new MutationObserver(updateThemeFromDOM);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  const isDarkMode = activeTheme === 'dark';

  useEffect(() => {
    const timer = setInterval(() => {
      setMarketSession(computeMarketSessionState());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Timeframe normalization (support 1m, 2m, 5m, 10m, 15m, 30m, 1h, 1D, 5D, 1M, 1Y)
  const [activeTimeframe, setActiveTimeframe] = useState<string>(selectedTimeframe || '5m');
  useEffect(() => {
    if (selectedTimeframe) {
      setActiveTimeframe(selectedTimeframe);
    }
  }, [selectedTimeframe]);

  const handleSelectTimeframe = (tf: string) => {
    setActiveTimeframe(tf);
    if (onTimeframeChange) onTimeframeChange(tf);
  };

  const isIntraday = useMemo(() => {
    const clean = activeTimeframe.toLowerCase();
    return ['1m', '2m', '5m', '10m', '15m', '30m', '1h', '1d'].includes(clean);
  }, [activeTimeframe]);

  // Session Scope Filter
  const [sessionScope, setSessionScope] = useState<MarketSessionType>('REGULAR');

  // Chart Presentation Type & Sub Indicator
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [subIndicator, setSubIndicator] = useState<SubIndicatorType>('volume');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Overlay Indicators
  const [showVwap, setShowVwap] = useState<boolean>(true);
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showSma50, setShowSma50] = useState<boolean>(false);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showStopLoss, setShowStopLoss] = useState<boolean>(true);
  const [showTarget, setShowTarget] = useState<boolean>(true);
  const [showCurrentPriceBeacon, setShowCurrentPriceBeacon] = useState<boolean>(true);

  // Live Mode vs Simulation Mode
  // If true, progress matches exact NY ET clock. If false, user is manually scrubbing or simulating replay.
  const [isLiveClockSync, setIsLiveClockSync] = useState<boolean>(true);

  // Timeline Progress ratio (0.0 to 1.0)
  // For market open, default to actual current session progress (or 1.0 if closed/weekend/holiday)
  const initialProgress = useMemo(() => {
    if (marketSession.isRegularOpen) {
      return Math.max(0.05, marketSession.sessionProgressPct / 100);
    }
    return 1.0;
  }, []);

  const [sessionProgress, setSessionProgress] = useState<number>(initialProgress);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync session progress with live NY market clock when in live sync mode
  useEffect(() => {
    if (isLiveClockSync && marketSession.isRegularOpen) {
      const realProgress = Math.max(0.02, Math.min(1.0, marketSession.sessionProgressPct / 100));
      setSessionProgress(realProgress);
    }
  }, [isLiveClockSync, marketSession.sessionProgressPct, marketSession.isRegularOpen]);

  // Live Micro-Tick simulation for the active forming candle
  const [liveTickOffset, setLiveTickOffset] = useState<number>(0);
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      // Subtle micro-price fluctuation (±0.05%)
      const rand = (Math.random() - 0.495) * (currentPrice * 0.001);
      setLiveTickOffset(Number(rand.toFixed(2)));
    }, 1500);
    return () => clearInterval(interval);
  }, [isLive, currentPrice]);

  // Generate Base Intraday Timeline Data according to interval and progress
  const intervalMinutes = useMemo(() => parseTimeframeToMinutes(activeTimeframe), [activeTimeframe]);

  const rawSessionData = useMemo(() => {
    if (!isIntraday && Array.isArray(data) && data.length > 0) {
      return data;
    }

    const generated = buildLiveSessionTimelineData(
      {
        symbol,
        price: currentPrice + liveTickOffset,
        previousClose: (dayOpen || currentPrice) * 0.99,
        open: dayOpen || currentPrice,
        dayHigh: Math.max(dayHigh || currentPrice, currentPrice + liveTickOffset),
        dayLow: Math.min(dayLow || currentPrice, currentPrice + liveTickOffset),
        volume: volume || 2000000,
        change,
        changePercent,
      } as any,
      intervalMinutes,
      sessionProgress,
      sessionScope
    );

    return generated.candles;
  }, [
    isIntraday,
    data,
    symbol,
    currentPrice,
    liveTickOffset,
    dayOpen,
    dayHigh,
    dayLow,
    volume,
    change,
    changePercent,
    intervalMinutes,
    sessionProgress,
    sessionScope,
  ]);

  // Enriched series with technical indicators (VWAP, EMA20, SMA50, BB, RSI, MACD, MFI, Heikin-Ashi)
  const enrichedSeries = useMemo<CalculatedIndicatorDataPoint[]>(() => {
    if (!rawSessionData || rawSessionData.length === 0) return [];
    try {
      return calculateAllTechnicalIndicators(rawSessionData);
    } catch (e) {
      console.error('Error calculating indicators:', e);
      return [];
    }
  }, [rawSessionData]);

  // Hovered candle info for HUD
  const [hoveredCandle, setHoveredCandle] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    change?: number;
    changePercent?: number;
  } | null>(null);

  // DOM Container Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const subChartContainerRef = useRef<HTMLDivElement>(null);
  const rootWrapperRef = useRef<HTMLDivElement>(null);

  // Lightweight Charts Instances
  const chartApiRef = useRef<IChartApi | null>(null);
  const subChartApiRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Sub-chart Series
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const mfiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Price Lines
  const stopLossLineRef = useRef<any>(null);
  const targetLineRef = useRef<any>(null);
  const currentPriceLineRef = useRef<any>(null);

  // Convert raw points to strictly ascending timestamps for lightweight-charts
  const chartDataFormatted = useMemo(() => {
    const defaultRes = {
      candles: [] as CandlestickData<UTCTimestamp>[],
      heikinAshi: [] as CandlestickData<UTCTimestamp>[],
      line: [] as LineData<UTCTimestamp>[],
      volume: [] as HistogramData<UTCTimestamp>[],
      vwap: [] as LineData<UTCTimestamp>[],
      ema20: [] as LineData<UTCTimestamp>[],
      sma50: [] as LineData<UTCTimestamp>[],
      bollingerUpper: [] as LineData<UTCTimestamp>[],
      bollingerLower: [] as LineData<UTCTimestamp>[],
      rsi: [] as LineData<UTCTimestamp>[],
      macdHist: [] as HistogramData<UTCTimestamp>[],
      macdLine: [] as LineData<UTCTimestamp>[],
      macdSignal: [] as LineData<UTCTimestamp>[],
      mfi: [] as LineData<UTCTimestamp>[],
    };

    if (enrichedSeries.length === 0) return defaultRes;

    const candles: CandlestickData<UTCTimestamp>[] = [];
    const heikinAshi: CandlestickData<UTCTimestamp>[] = [];
    const line: LineData<UTCTimestamp>[] = [];
    const volumeData: HistogramData<UTCTimestamp>[] = [];
    const vwapData: LineData<UTCTimestamp>[] = [];
    const ema20Data: LineData<UTCTimestamp>[] = [];
    const sma50Data: LineData<UTCTimestamp>[] = [];
    const bollingerUpperData: LineData<UTCTimestamp>[] = [];
    const bollingerLowerData: LineData<UTCTimestamp>[] = [];
    const rsiData: LineData<UTCTimestamp>[] = [];
    const macdHistData: HistogramData<UTCTimestamp>[] = [];
    const macdLineData: LineData<UTCTimestamp>[] = [];
    const macdSignalData: LineData<UTCTimestamp>[] = [];
    const mfiData: LineData<UTCTimestamp>[] = [];

    let lastSec = 0;
    const baseEpoch = Math.floor(
      (enrichedSeries[0]?.timestamp && !isNaN(enrichedSeries[0].timestamp)
        ? enrichedSeries[0].timestamp
        : Date.now() - enrichedSeries.length * 60000) / 1000
    );

    for (let i = 0; i < enrichedSeries.length; i++) {
      const p = enrichedSeries[i];
      if (!p) continue;

      let sec = p.timestamp && !isNaN(p.timestamp) ? Math.floor(p.timestamp / 1000) : baseEpoch + i * 60;
      if (sec <= lastSec) {
        sec = lastSec + 1;
      }
      lastSec = sec;

      const time = sec as UTCTimestamp;
      const safeClose = typeof p.close === 'number' && !isNaN(p.close) ? p.close : currentPrice || 100;
      const safeOpen = typeof p.open === 'number' && !isNaN(p.open) ? p.open : safeClose;
      const safeHigh = typeof p.high === 'number' && !isNaN(p.high) ? Math.max(p.high, safeOpen, safeClose) : Math.max(safeOpen, safeClose);
      const safeLow = typeof p.low === 'number' && !isNaN(p.low) ? Math.min(p.low, safeOpen, safeClose) : Math.min(safeOpen, safeClose);
      const safeVol = typeof p.volume === 'number' && !isNaN(p.volume) ? p.volume : 0;
      const isUp = safeClose >= safeOpen;

      // Regular Candle
      candles.push({
        time,
        open: safeOpen,
        high: safeHigh,
        low: safeLow,
        close: safeClose,
      });

      // Heikin-Ashi Candle
      if (
        typeof p.haOpen === 'number' && !isNaN(p.haOpen) &&
        typeof p.haHigh === 'number' && !isNaN(p.haHigh) &&
        typeof p.haLow === 'number' && !isNaN(p.haLow) &&
        typeof p.haClose === 'number' && !isNaN(p.haClose)
      ) {
        heikinAshi.push({
          time,
          open: p.haOpen,
          high: p.haHigh,
          low: p.haLow,
          close: p.haClose,
        });
      } else {
        heikinAshi.push({
          time,
          open: safeOpen,
          high: safeHigh,
          low: safeLow,
          close: safeClose,
        });
      }

      // Line / Area
      line.push({
        time,
        value: safeClose,
      });

      // Volume with color
      volumeData.push({
        time,
        value: safeVol,
        color: isUp ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });

      // Indicators
      if (typeof p.vwap === 'number' && !isNaN(p.vwap)) vwapData.push({ time, value: p.vwap });
      if (typeof p.ema20 === 'number' && !isNaN(p.ema20)) ema20Data.push({ time, value: p.ema20 });
      if (typeof p.sma50 === 'number' && !isNaN(p.sma50)) sma50Data.push({ time, value: p.sma50 });

      if (typeof p.bbUpper === 'number' && !isNaN(p.bbUpper)) bollingerUpperData.push({ time, value: p.bbUpper });
      if (typeof p.bbLower === 'number' && !isNaN(p.bbLower)) bollingerLowerData.push({ time, value: p.bbLower });

      if (typeof p.rsi === 'number' && !isNaN(p.rsi)) {
        rsiData.push({ time, value: p.rsi });
      }

      if (typeof p.macdHist === 'number' && !isNaN(p.macdHist)) {
        macdHistData.push({
          time,
          value: p.macdHist,
          color: p.macdHist >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)',
        });
      }
      if (typeof p.macd === 'number' && !isNaN(p.macd)) {
        macdLineData.push({ time, value: p.macd });
      }
      if (typeof p.macdSignal === 'number' && !isNaN(p.macdSignal)) {
        macdSignalData.push({ time, value: p.macdSignal });
      }

      if (typeof p.mfi === 'number' && !isNaN(p.mfi)) {
        mfiData.push({ time, value: p.mfi });
      }
    }

    return {
      candles,
      heikinAshi,
      line,
      volume: volumeData,
      vwap: vwapData,
      ema20: ema20Data,
      sma50: sma50Data,
      bollingerUpper: bollingerUpperData,
      bollingerLower: bollingerLowerData,
      rsi: rsiData,
      macdHist: macdHistData,
      macdLine: macdLineData,
      macdSignal: macdSignalData,
      mfi: mfiData,
    };
  }, [enrichedSeries, currentPrice]);

  // Main Chart Initialization
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartApiRef.current) {
      try {
        chartApiRef.current.remove();
      } catch (e) {}
      chartApiRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // Estimate future remaining candles to reserve empty timeline space up to 16:00
    const totalSessionBars = Math.floor(390 / Math.max(1, intervalMinutes));
    const activeBars = enrichedSeries.length;
    const futureBarsRemaining = Math.max(2, totalSessionBars - activeBars);

    const chartBg = isDarkMode ? '#090D14' : '#FFFFFF';
    const chartText = isDarkMode ? '#94A3B8' : '#475569';
    const chartGrid = isDarkMode ? 'rgba(30, 41, 59, 0.45)' : 'rgba(226, 232, 240, 0.9)';
    const chartBorder = isDarkMode ? '#1E293B' : '#E2E8F0';
    const crosshairColor = isDarkMode ? '#38BDF8' : '#0284C7';
    const crosshairLabelBg = isDarkMode ? '#0284C7' : '#0369A1';

    let chart: IChartApi;
    try {
      chart = createChart(container, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: chartBg },
          textColor: chartText,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace, -apple-system, sans-serif",
        },
        grid: {
          vertLines: { color: chartGrid, style: LineStyle.Dotted },
          horzLines: { color: chartGrid, style: LineStyle.Dotted },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: crosshairColor,
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: crosshairLabelBg,
          },
          horzLine: {
            color: crosshairColor,
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: crosshairLabelBg,
          },
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
        rightPriceScale: {
          borderColor: chartBorder,
          scaleMargins: {
            top: 0.12,
            bottom: subIndicator === 'volume' ? 0.25 : 0.12,
          },
          alignLabels: true,
          autoScale: true,
        },
        timeScale: {
          borderColor: chartBorder,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: isIntraday ? Math.min(60, futureBarsRemaining + 5) : 10,
          barSpacing: isIntraday ? 10 : 8,
          minBarSpacing: 3,
        },
      });
      chartApiRef.current = chart;
    } catch (err) {
      console.error('Failed to create main chart:', err);
      return;
    }

    // 1. Create Main Price Series
    try {
      let mainSeries: ISeriesApi<any>;
      if (chartType === 'candlestick' || chartType === 'heikinAshi') {
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: true,
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      } else if (chartType === 'area') {
        mainSeries = chart.addSeries(AreaSeries, {
          topColor: isPositive ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)',
          bottomColor: 'rgba(9, 13, 20, 0.01)',
          lineColor: isPositive ? '#22c55e' : '#ef4444',
          lineWidth: 2,
        });
      } else if (chartType === 'bars') {
        mainSeries = chart.addSeries(BarSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
        });
      } else {
        mainSeries = chart.addSeries(LineSeries, {
          color: '#38bdf8',
          lineWidth: 2,
        });
      }
      mainSeriesRef.current = mainSeries;

      // 2. Add Integrated Volume Series
      if (subIndicator === 'volume') {
        const volSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        });
        try {
          volSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
          });
        } catch (e) {}
        volumeSeriesRef.current = volSeries;
      }

      // 3. Technical Indicator Overlays
      if (showVwap) {
        vwapSeriesRef.current = chart.addSeries(LineSeries, {
          color: '#10b981',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          title: 'VWAP',
        });
      }
      if (showEma20) {
        ema20SeriesRef.current = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 1,
          title: 'EMA 20',
        });
      }
      if (showSma50) {
        sma50SeriesRef.current = chart.addSeries(LineSeries, {
          color: '#a855f7',
          lineWidth: 1,
          title: 'SMA 50',
        });
      }
      if (showBollinger) {
        bollingerUpperRef.current = chart.addSeries(LineSeries, {
          color: 'rgba(56, 189, 248, 0.7)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Upper',
        });
        bollingerLowerRef.current = chart.addSeries(LineSeries, {
          color: 'rgba(56, 189, 248, 0.7)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: 'BB Lower',
        });
      }

      // 4. Crosshair Move Handler for HUD & Tooltip
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.seriesData || !param.seriesData.get(mainSeries)) {
          setHoveredCandle(null);
          return;
        }

        const bar: any = param.seriesData.get(mainSeries);
        const volBar: any = volumeSeriesRef.current ? param.seriesData.get(volumeSeriesRef.current) : null;

        if (bar) {
          const timeStr =
            typeof param.time === 'number'
              ? new Date(param.time * 1000).toLocaleTimeString([], {
                  timeZone: 'America/New_York',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : String(param.time);

          const open = Number(bar.open ?? bar.value ?? 0);
          const high = Number(bar.high ?? bar.value ?? 0);
          const low = Number(bar.low ?? bar.value ?? 0);
          const close = Number(bar.close ?? bar.value ?? 0);
          const diff = close - open;
          const diffPct = open > 0 ? (diff / open) * 100 : 0;
          const volVal = volBar ? Number(volBar.value ?? 0) : undefined;

          setHoveredCandle({
            time: `${timeStr} ET`,
            open,
            high,
            low,
            close,
            volume: volVal,
            change: diff,
            changePercent: diffPct,
          });
        }
      });
    } catch (err) {
      console.error('Error configuring series:', err);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0 && chartApiRef.current) {
        try {
          chartApiRef.current.applyOptions({ width: newWidth, height: newHeight });
        } catch (e) {}
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartApiRef.current) {
        try {
          chartApiRef.current.remove();
        } catch (e) {}
        chartApiRef.current = null;
      }
    };
  }, [
    chartType,
    subIndicator,
    showVwap,
    showEma20,
    showSma50,
    showBollinger,
    isPositive,
    isIntraday,
    intervalMinutes,
    activeTheme,
    isDarkMode,
  ]);

  // Sub-Chart Initialization (for RSI, MACD, MFI)
  useEffect(() => {
    if (!subChartContainerRef.current || subIndicator === 'none' || subIndicator === 'volume') {
      if (subChartApiRef.current) {
        try {
          subChartApiRef.current.remove();
        } catch (e) {}
        subChartApiRef.current = null;
      }
      return;
    }

    const container = subChartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 130;

    let subChart: IChartApi;
    try {
      subChart = createChart(container, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: isDarkMode ? '#090D14' : '#FFFFFF' },
          textColor: isDarkMode ? '#94A3B8' : '#475569',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: isDarkMode ? 'rgba(30, 41, 59, 0.35)' : 'rgba(226, 232, 240, 0.8)', style: LineStyle.Dotted },
          horzLines: { color: isDarkMode ? 'rgba(30, 41, 59, 0.35)' : 'rgba(226, 232, 240, 0.8)', style: LineStyle.Dotted },
        },
        timeScale: {
          visible: false,
        },
        rightPriceScale: {
          borderColor: isDarkMode ? '#1E293B' : '#E2E8F0',
        },
      });
      subChartApiRef.current = subChart;

      if (subIndicator === 'rsi') {
        const rsiSeries = subChart.addSeries(LineSeries, {
          color: '#a855f7',
          lineWidth: 1,
          title: 'RSI 14',
        });
        rsiSeries.createPriceLine({
          price: 70,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: '70 OB',
        });
        rsiSeries.createPriceLine({
          price: 30,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: '30 OS',
        });
        rsiSeriesRef.current = rsiSeries;
      } else if (subIndicator === 'macd') {
        macdHistRef.current = subChart.addSeries(HistogramSeries, {
          title: 'MACD Hist',
        });
        macdLineRef.current = subChart.addSeries(LineSeries, {
          color: '#06b6d4',
          lineWidth: 1,
          title: 'MACD',
        });
        macdSignalRef.current = subChart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1,
          title: 'Signal',
        });
      } else if (subIndicator === 'mfi') {
        const mfiSeries = subChart.addSeries(LineSeries, {
          color: '#06b6d4',
          lineWidth: 1,
          title: 'MFI 14',
        });
        mfiSeries.createPriceLine({
          price: 80,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: '80 OB',
        });
        mfiSeries.createPriceLine({
          price: 20,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: '20 OS',
        });
        mfiSeriesRef.current = mfiSeries;
      }

      if (chartApiRef.current) {
        chartApiRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
          if (range && subChartApiRef.current) {
            try {
              subChartApiRef.current.timeScale().setVisibleRange(range);
            } catch (e) {}
          }
        });
      }
    } catch (err) {
      console.error('Error creating sub-chart:', err);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0 && subChartApiRef.current) {
        try {
          subChartApiRef.current.applyOptions({ width: newWidth, height: newHeight });
        } catch (e) {}
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (subChartApiRef.current) {
        try {
          subChartApiRef.current.remove();
        } catch (e) {}
          subChartApiRef.current = null;
      }
    };
  }, [subIndicator, activeTheme, isDarkMode]);

  // Feed Data into Series whenever formatted data updates
  useEffect(() => {
    if (!mainSeriesRef.current) return;

    const {
      candles,
      heikinAshi,
      line,
      volume: volData,
      vwap,
      ema20,
      sma50,
      bollingerUpper,
      bollingerLower,
      rsi,
      macdHist,
      macdLine,
      macdSignal,
      mfi,
    } = chartDataFormatted;

    try {
      if (chartType === 'candlestick') {
        mainSeriesRef.current.setData(candles);
      } else if (chartType === 'heikinAshi') {
        mainSeriesRef.current.setData(heikinAshi);
      } else if (chartType === 'bars') {
        mainSeriesRef.current.setData(candles);
      } else {
        mainSeriesRef.current.setData(line);
      }

      if (volumeSeriesRef.current && subIndicator === 'volume') {
        volumeSeriesRef.current.setData(volData);
      }

      if (vwapSeriesRef.current && showVwap) {
        vwapSeriesRef.current.setData(vwap);
      }
      if (ema20SeriesRef.current && showEma20) {
        ema20SeriesRef.current.setData(ema20);
      }
      if (sma50SeriesRef.current && showSma50) {
        sma50SeriesRef.current.setData(sma50);
      }
      if (bollingerUpperRef.current && showBollinger) {
        bollingerUpperRef.current.setData(bollingerUpper);
      }
      if (bollingerLowerRef.current && showBollinger) {
        bollingerLowerRef.current.setData(bollingerLower);
      }

      if (rsiSeriesRef.current && subIndicator === 'rsi') {
        rsiSeriesRef.current.setData(rsi);
      }
      if (macdHistRef.current && subIndicator === 'macd') {
        macdHistRef.current.setData(macdHist);
      }
      if (macdLineRef.current && subIndicator === 'macd') {
        macdLineRef.current.setData(macdLine);
      }
      if (macdSignalRef.current && subIndicator === 'macd') {
        macdSignalRef.current.setData(macdSignal);
      }
      if (mfiSeriesRef.current && subIndicator === 'mfi') {
        mfiSeriesRef.current.setData(mfi);
      }

      // Live Price / Stop / Target lines
      if (mainSeriesRef.current) {
        if (stopLossLineRef.current) {
          try {
            mainSeriesRef.current.removePriceLine(stopLossLineRef.current);
          } catch (e) {}
          stopLossLineRef.current = null;
        }
        if (targetLineRef.current) {
          try {
            mainSeriesRef.current.removePriceLine(targetLineRef.current);
          } catch (e) {}
          targetLineRef.current = null;
        }
        if (currentPriceLineRef.current) {
          try {
            mainSeriesRef.current.removePriceLine(currentPriceLineRef.current);
          } catch (e) {}
          currentPriceLineRef.current = null;
        }

        // Live Current Price Horizontal Tracking Line
        if (showCurrentPriceBeacon && currentPrice > 0) {
          currentPriceLineRef.current = mainSeriesRef.current.createPriceLine({
            price: currentPrice + liveTickOffset,
            color: isPositive ? '#22c55e' : '#ef4444',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `● $${(currentPrice + liveTickOffset).toFixed(2)}`,
          });
        }

        if (showStopLoss && typeof stopLossPrice === 'number' && !isNaN(stopLossPrice) && stopLossPrice > 0) {
          stopLossLineRef.current = mainSeriesRef.current.createPriceLine({
            price: stopLossPrice,
            color: '#f43f5e',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'STOP',
          });
        }

        if (showTarget && typeof targetPrice === 'number' && !isNaN(targetPrice) && targetPrice > 0) {
          targetLineRef.current = mainSeriesRef.current.createPriceLine({
            price: targetPrice,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'TARGET',
          });
        }
      }
    } catch (err) {
      console.error('Error feeding chart series data:', err);
    }
  }, [
    chartDataFormatted,
    chartType,
    subIndicator,
    showVwap,
    showEma20,
    showSma50,
    showBollinger,
    showStopLoss,
    showTarget,
    showCurrentPriceBeacon,
    stopLossPrice,
    targetPrice,
    currentPrice,
    liveTickOffset,
    isPositive,
  ]);

  // Fit content helper
  const handleFitContent = useCallback(() => {
    try {
      if (chartApiRef.current) {
        chartApiRef.current.timeScale().fitContent();
      }
      if (subChartApiRef.current) {
        subChartApiRef.current.timeScale().fitContent();
      }
    } catch (e) {}
  }, []);

  // Zoom In helper
  const handleZoomIn = useCallback(() => {
    try {
      if (chartApiRef.current) {
        const timeScale = chartApiRef.current.timeScale();
        const currentSpacing = (timeScale as any).options?.()?.barSpacing || 10;
        timeScale.applyOptions({ barSpacing: Math.min(50, currentSpacing * 1.3) });
      }
    } catch (e) {}
  }, []);

  // Zoom Out helper
  const handleZoomOut = useCallback(() => {
    try {
      if (chartApiRef.current) {
        const timeScale = chartApiRef.current.timeScale();
        const currentSpacing = (timeScale as any).options?.()?.barSpacing || 10;
        timeScale.applyOptions({ barSpacing: Math.max(2, currentSpacing * 0.75) });
      }
    } catch (e) {}
  }, []);

  // Scroll to Realtime / Latest Candle
  const handleScrollToLatest = useCallback(() => {
    try {
      if (chartApiRef.current) {
        chartApiRef.current.timeScale().scrollToRealTime();
      }
    } catch (e) {}
  }, []);

  // Playback / Live Replay Loop
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }

    // Step session progress by ~1.5% each tick
    const intervalMs = Math.max(40, 300 / playbackSpeed);

    playTimerRef.current = setInterval(() => {
      setSessionProgress((prev) => {
        if (prev >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return Math.min(1.0, prev + 0.015);
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed]);

  const handlePlayToggle = () => {
    setIsLiveClockSync(false);
    if (sessionProgress >= 1.0) {
      setSessionProgress(0.02);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleResetReplay = () => {
    setIsLiveClockSync(false);
    setIsPlaying(false);
    setSessionProgress(0.02);
  };

  const handleFastForwardToEnd = () => {
    setIsLiveClockSync(false);
    setIsPlaying(false);
    setSessionProgress(1.0);
  };

  const handleSyncToLiveMarket = () => {
    setIsPlaying(false);
    setIsLiveClockSync(true);
    if (marketSession.isRegularOpen) {
      setSessionProgress(Math.max(0.02, marketSession.sessionProgressPct / 100));
    } else {
      setSessionProgress(1.0);
    }
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!rootWrapperRef.current) return;
    if (!isFullscreen) {
      if (rootWrapperRef.current.requestFullscreen) {
        rootWrapperRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Active latest data point
  const lastActivePoint = enrichedSeries[enrichedSeries.length - 1] || null;
  const activeEffectivePrice = currentPrice + liveTickOffset;
  const displayPrice = hoveredCandle ? hoveredCandle.close : (lastActivePoint?.close ?? activeEffectivePrice);
  const displayChange = hoveredCandle ? (hoveredCandle.change ?? 0) : change;
  const displayChangePct = hoveredCandle ? (hoveredCandle.changePercent ?? 0) : changePercent;

  // Active forming candle timeframe remaining calculation
  const totalSessionBars = Math.floor(390 / Math.max(1, intervalMinutes));
  const currentBarIndex = Math.min(totalSessionBars, Math.max(1, enrichedSeries.length));
  const effectiveProgressPct = Math.round(sessionProgress * 100);

  return (
    <div
      ref={rootWrapperRef}
      id="tradingview-professional-chart"
      className={`bg-white dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-2xl overflow-hidden flex flex-col font-sans transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'w-full'
      }`}
    >
      {/* ===================== TOP HEADER & TICKER BANNER ===================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-[#0f141d] border-b border-slate-200 dark:border-slate-800">
        {/* Left: Symbol, Company, Live Price & Session Status Beacon */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-mono font-black text-slate-900 dark:text-white tracking-wider">
              {symbol}
            </span>
            {companyName && (
              <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[130px] truncate hidden md:inline">
                {companyName}
              </span>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Current / Hovered Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-mono font-extrabold text-slate-900 dark:text-white">
              ${(displayPrice || 0).toFixed(2)}
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                displayChange >= 0
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              {displayChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {displayChange >= 0 ? '+' : ''}
              {(displayChange || 0).toFixed(2)} ({(displayChangePct || 0).toFixed(2)}%)
            </span>
          </div>

          {/* Market Session Status Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border shadow-sm"
            style={{
              backgroundColor: `${marketSession.statusColor}15`,
              borderColor: `${marketSession.statusColor}40`,
              color: marketSession.statusColor,
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${marketSession.isRegularOpen ? 'animate-ping' : ''}`}
              style={{ backgroundColor: marketSession.statusColor }}
            />
            <span>{isAr ? marketSession.statusLabelAr : marketSession.statusLabelEn}</span>
          </div>
        </div>

        {/* Right: Integrated Custom Chart Control Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <ChartControlToolbar
            subIndicator={subIndicator}
            onSubIndicatorChange={(ind) => setSubIndicator(ind as any)}
            showBollinger={showBollinger}
            onToggleBollinger={() => setShowBollinger(!showBollinger)}
            showEma20={showEma20}
            onToggleEma20={() => setShowEma20(!showEma20)}
            showVwap={showVwap}
            onToggleVwap={() => setShowVwap(!showVwap)}
            chartType={chartType}
            onChartTypeChange={(type) => setChartType(type as any)}
            selectedTimeframe={activeTimeframe}
            onTimeframeChange={(tf) => handleSelectTimeframe(tf)}
            lang={lang}
            className="!p-0 !bg-transparent !border-0 !shadow-none"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
            <button
              type="button"
              id="fit-chart-btn"
              title={isAr ? 'ملاءمة الشارت' : 'Fit Chart'}
              onClick={handleFitContent}
              className="p-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-800 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="fullscreen-toggle-btn"
              title={isFullscreen ? (isAr ? 'تصغير' : 'Exit Fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
              onClick={toggleFullscreen}
              className="p-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-800 transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ===================== SESSION TIMELINE & HUD PROGRESS STRIP ===================== */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-[#090D14] border-b border-slate-200 dark:border-slate-800/80 flex flex-col gap-2">
        {/* Top metrics line */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 text-slate-700 dark:text-slate-300">
            {hoveredCandle ? (
              <>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">{hoveredCandle.time}</span>
                <span>O: <strong className="text-slate-900 dark:text-white">${hoveredCandle.open.toFixed(2)}</strong></span>
                <span>H: <strong className="text-emerald-600 dark:text-emerald-400">${hoveredCandle.high.toFixed(2)}</strong></span>
                <span>L: <strong className="text-rose-600 dark:text-rose-400">${hoveredCandle.low.toFixed(2)}</strong></span>
                <span>C: <strong className="text-slate-900 dark:text-white">${hoveredCandle.close.toFixed(2)}</strong></span>
                {hoveredCandle.change !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${hoveredCandle.change >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'}`}>
                    {hoveredCandle.change >= 0 ? '+' : ''}{hoveredCandle.change.toFixed(2)} ({hoveredCandle.changePercent ? (hoveredCandle.changePercent >= 0 ? '+' : '') + hoveredCandle.changePercent.toFixed(2) + '%' : '0%'})
                  </span>
                )}
                {hoveredCandle.volume !== undefined && hoveredCandle.volume > 0 && (
                  <span>Vol: <strong className="text-cyan-600 dark:text-cyan-400">{hoveredCandle.volume.toLocaleString()}</strong></span>
                )}
              </>
            ) : (
              <>
                <span>Open: <strong className="text-slate-800 dark:text-slate-200">${(dayOpen || currentPrice).toFixed(2)}</strong></span>
                <span>High: <strong className="text-emerald-600 dark:text-emerald-400">${(dayHigh || currentPrice * 1.02).toFixed(2)}</strong></span>
                <span>Low: <strong className="text-rose-600 dark:text-rose-400">${(dayLow || currentPrice * 0.98).toFixed(2)}</strong></span>
                {volume !== undefined && <span>Vol: <strong className="text-cyan-600 dark:text-cyan-400">{volume.toLocaleString()}</strong></span>}
                {vwapPrice !== undefined && <span>VWAP: <strong className="text-emerald-600 dark:text-emerald-400">${vwapPrice.toFixed(2)}</strong></span>}
              </>
            )}
          </div>

          {/* New York Live Clock & Session Progress Indicator */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>NY: <strong className="text-slate-900 dark:text-white">{marketSession.nyTimeFormatted}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">
                {isAr ? 'تقدم الجلسة:' : 'Session:'}{' '}
                <strong className="text-cyan-600 dark:text-cyan-400">{effectiveProgressPct}%</strong>
              </span>
              {isLiveClockSync ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                  LIVE SYNC
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                  REPLAY
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Visual 09:30 -> 16:00 Session Progress Gauge */}
        {isIntraday && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              09:30 AM ET
            </span>

            <div className="relative flex-1 h-2 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
              {/* Progress fill */}
              <div
                className="h-full bg-gradient-to-r from-cyan-600 via-emerald-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${effectiveProgressPct}%` }}
              />
              {/* Current Price Pin */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#38bdf8] transform -translate-x-1/2"
                style={{ left: `${effectiveProgressPct}%` }}
              />
            </div>

            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              04:00 PM ET
            </span>
          </div>
        )}
      </div>

      {/* ===================== MAIN CHART CANVAS ===================== */}
      <div className="relative flex-1 w-full min-h-[400px] bg-white dark:bg-[#090D14] group">
        <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />

        {/* Live Candle Formation Floating Indicator */}
        {isIntraday && isLive && (
          <div className="absolute top-3 left-4 pointer-events-none z-10 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-cyan-500/30 text-[11px] font-mono shadow-lg backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping" />
            <span className="text-cyan-700 dark:text-cyan-300 font-bold">
              {isAr ? `شمعة ${activeTimeframe} الحية` : `Forming ${activeTimeframe} Candle`}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-900 dark:text-white font-bold">
              ${(currentPrice + liveTickOffset).toFixed(2)}
            </span>
          </div>
        )}

        {/* Floating Zoom & Navigation Controls Overlay */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-sm">
          <button
            type="button"
            id="chart-zoom-in-btn"
            title={isAr ? 'تكبير (Zoom In)' : 'Zoom In (+)'}
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="chart-zoom-out-btn"
            title={isAr ? 'تصغير (Zoom Out)' : 'Zoom Out (-)'}
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="chart-fit-view-btn"
            title={isAr ? 'ملاءمة النطاق الكامل' : 'Fit Entire Range'}
            onClick={handleFitContent}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer text-xs font-mono font-bold"
          >
            <Scan className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="chart-scroll-latest-btn"
            title={isAr ? 'الانتقال لآخر شمعة' : 'Scroll to Latest Candle'}
            onClick={handleScrollToLatest}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer text-xs font-mono font-bold"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===================== SUB-CHART (RSI / MACD / MFI) ===================== */}
      {subIndicator !== 'none' && subIndicator !== 'volume' && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D14] h-32 w-full">
          <div ref={subChartContainerRef} className="w-full h-full" />
        </div>
      )}

      {/* ===================== LIVE SESSION CONTROLS & TIMELINE SCRUBBER ===================== */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-[#0f141d] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls & Replay System */}
        <div className="flex items-center gap-2">
          <button
            id="session-replay-reset-btn"
            title={isAr ? 'بداية الجلسة 09:30' : 'Rewind to 09:30 Open'}
            onClick={handleResetReplay}
            className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="session-play-toggle-btn"
            onClick={handlePlayToggle}
            className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{isAr ? 'إيقاف المحاكاة' : 'Pause'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{isAr ? 'محاكاة حركة الجلسة' : 'Replay Session'}</span>
              </>
            )}
          </button>

          <button
            id="session-ff-btn"
            title={isAr ? 'نهاية الجلسة 16:00' : 'Jump to Close 16:00'}
            onClick={handleFastForwardToEnd}
            className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Sync to Live Market Clock Button */}
          <button
            id="session-sync-live-btn"
            title={isAr ? 'مزامنة مع توقيت السوق الحي' : 'Sync to Live Market Time'}
            onClick={handleSyncToLiveMarket}
            className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1 transition ${
              isLiveClockSync
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveClockSync ? 'animate-pulse text-white' : 'text-slate-500'}`} />
            <span>{isAr ? 'مزامنة حية' : 'Live Sync'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-300 dark:border-slate-800 text-[11px] font-mono">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.5 rounded transition ${
                  playbackSpeed === spd
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scrubber Slider */}
        <div className="flex-1 min-w-[220px] flex items-center gap-3">
          <input
            id="session-timeline-scrubber"
            type="range"
            min={2}
            max={100}
            value={effectiveProgressPct}
            onChange={(e) => {
              setIsLiveClockSync(false);
              setIsPlaying(false);
              setSessionProgress(Number(e.target.value) / 100);
            }}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-600 dark:accent-cyan-500"
          />
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold whitespace-nowrap">
            {effectiveProgressPct}%
          </span>
        </div>

        {/* Status Notice */}
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden xl:flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {isAr
              ? 'محرك جلسات التداول الحي (09:30 ص → 04:00 م ET)'
              : 'Live Market Session Engine (09:30 AM → 04:00 PM ET)'}
          </span>
        </div>
      </div>
    </div>
  );
};
