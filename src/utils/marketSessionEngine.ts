import { ChartDataPoint, StockItem, StockQuote } from '../types.js';

export type MarketSessionType = 'REGULAR' | 'PRE_MARKET' | 'AFTER_HOURS' | 'ALL_DAY';
export type MarketStatusType = 'OPEN' | 'PRE_MARKET' | 'AFTER_HOURS' | 'CLOSED' | 'HOLIDAY' | 'WEEKEND';

export interface MarketSessionState {
  status: MarketStatusType;
  statusLabelAr: string;
  statusLabelEn: string;
  statusColor: string;
  nyTimeFormatted: string;
  nyDateFormatted: string;
  nyHour: number;
  nyMinute: number;
  nySecond: number;
  totalMinutesInDay: number;
  isTradingDay: boolean;
  isRegularOpen: boolean;
  isPreMarket: boolean;
  isAfterHours: boolean;
  sessionProgressPct: number; // 0 to 100
  sessionMinutesElapsed: number;
  sessionMinutesTotal: number; // 390 for regular
  sessionOpenTimeFormatted: string;
  sessionCloseTimeFormatted: string;
  nextSessionEventAr: string;
  nextSessionEventEn: string;
  sessionOpenTimestamp: number;
  sessionCloseTimestamp: number;
}

// US Market Official Holidays (NYSE / NASDAQ)
export const US_MARKET_HOLIDAYS: Record<string, string> = {
  // 2024
  '2024-01-01': "New Year's Day",
  '2024-01-15': 'Martin Luther King Jr. Day',
  '2024-02-19': "Washington's Birthday",
  '2024-03-29': 'Good Friday',
  '2024-05-27': 'Memorial Day',
  '2024-06-19': 'Juneteenth National Independence Day',
  '2024-07-04': 'Independence Day',
  '2024-09-02': 'Labor Day',
  '2024-11-28': 'Thanksgiving Day',
  '2024-12-25': 'Christmas Day',
  // 2025
  '2025-01-01': "New Year's Day",
  '2025-01-20': 'Martin Luther King Jr. Day',
  '2025-02-17': "Washington's Birthday",
  '2025-04-18': 'Good Friday',
  '2025-05-26': 'Memorial Day',
  '2025-06-19': 'Juneteenth National Independence Day',
  '2025-07-04': 'Independence Day',
  '2025-09-01': 'Labor Day',
  '2025-11-27': 'Thanksgiving Day',
  '2025-12-25': 'Christmas Day',
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Martin Luther King Jr. Day',
  '2026-02-16': "Washington's Birthday",
  '2026-04-03': 'Good Friday',
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth National Independence Day',
  '2026-07-03': 'Independence Day (Observed)',
  '2026-09-07': 'Labor Day',
  '2026-11-26': 'Thanksgiving Day',
  '2026-12-25': 'Christmas Day',
  // 2027
  '2027-01-01': "New Year's Day",
  '2027-01-18': 'Martin Luther King Jr. Day',
  '2027-02-15': "Washington's Birthday",
  '2027-03-26': 'Good Friday',
  '2027-05-31': 'Memorial Day',
  '2027-06-18': 'Juneteenth (Observed)',
  '2027-07-05': 'Independence Day (Observed)',
  '2027-09-06': 'Labor Day',
  '2027-11-25': 'Thanksgiving Day',
  '2027-12-24': 'Christmas (Observed)',
};

// US Market Early Close Dates (NYSE / NASDAQ - closes at 1:00 PM ET / 13:00)
export const US_MARKET_EARLY_CLOSES: Record<string, string> = {
  '2024-07-03': 'Day before Independence Day (1:00 PM Close)',
  '2024-11-29': 'Day after Thanksgiving (1:00 PM Close)',
  '2024-12-24': 'Christmas Eve (1:00 PM Close)',
  '2025-07-03': 'Day before Independence Day (1:00 PM Close)',
  '2025-11-28': 'Day after Thanksgiving (1:00 PM Close)',
  '2025-12-24': 'Christmas Eve (1:00 PM Close)',
  '2026-11-27': 'Day after Thanksgiving (1:00 PM Close)',
  '2026-12-24': 'Christmas Eve (1:00 PM Close)',
  '2027-11-26': 'Day after Thanksgiving (1:00 PM Close)',
};

/**
 * MarketSessionEngine class providing full US market state calculations,
 * session progress tracking, holiday recognition, and timeline construction.
 */
export class MarketSessionEngine {
  public static readonly HOLIDAYS = US_MARKET_HOLIDAYS;
  public static readonly EARLY_CLOSES = US_MARKET_EARLY_CLOSES;

  public static getNyTime(customDate?: Date) {
    return getNyMarketTime(customDate);
  }

  public static isWeekend(customDate?: Date): boolean {
    const ny = getNyMarketTime(customDate);
    return ny.weekday === 'Sat' || ny.weekday === 'Sun';
  }

  public static isHoliday(customDate?: Date): { isHoliday: boolean; holidayName?: string } {
    const ny = getNyMarketTime(customDate);
    const holidayName = US_MARKET_HOLIDAYS[ny.dateKey];
    return { isHoliday: Boolean(holidayName), holidayName };
  }

  public static isEarlyClose(customDate?: Date): { isEarlyClose: boolean; reason?: string } {
    const ny = getNyMarketTime(customDate);
    const reason = US_MARKET_EARLY_CLOSES[ny.dateKey];
    return { isEarlyClose: Boolean(reason), reason };
  }

  public static isTradingDay(customDate?: Date): boolean {
    const ny = getNyMarketTime(customDate);
    const isWeekend = ny.weekday === 'Sat' || ny.weekday === 'Sun';
    const isHoliday = Boolean(US_MARKET_HOLIDAYS[ny.dateKey]);
    return !isWeekend && !isHoliday;
  }

  public static computeState(customDate?: Date): MarketSessionState {
    return computeMarketSessionState(customDate);
  }

  public static parseTimeframe(tf: string): number {
    return parseTimeframeToMinutes(tf);
  }

  public static buildTimeline(
    stock: StockItem | StockQuote,
    intervalMinutes: number = 5,
    sessionProgress: number = 1.0,
    sessionScope: MarketSessionType = 'REGULAR'
  ) {
    return buildLiveSessionTimelineData(stock, intervalMinutes, sessionProgress, sessionScope);
  }

  public static aggregateCandles(
    ticks: { timestamp: number; price: number; volume?: number }[],
    intervalMinutes: number,
    sessionOpenSec: number
  ) {
    return aggregateCandlesByInterval(ticks, intervalMinutes, sessionOpenSec);
  }
}

/**
 * Returns current New York date/time components with proper DST handling.
 */
export function getNyMarketTime(customDate?: Date) {
  const targetDate = customDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(targetDate);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  const weekday = map.weekday; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);
  const totalMinutes = hour * 60 + minute;
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    year,
    month,
    day,
    weekday,
    hour,
    minute,
    second,
    totalMinutes,
    dateKey,
    isoFormatted: `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
  };
}

/**
 * Computes exact market session boundaries, status, and progress.
 */
export function computeMarketSessionState(targetDate?: Date): MarketSessionState {
  const ny = getNyMarketTime(targetDate);
  const isWeekend = ny.weekday === 'Sat' || ny.weekday === 'Sun';
  const holidayName = US_MARKET_HOLIDAYS[ny.dateKey];
  const isHoliday = !!holidayName;
  const earlyCloseReason = US_MARKET_EARLY_CLOSES[ny.dateKey];
  const isEarlyClose = Boolean(earlyCloseReason);
  const isTradingDay = !isWeekend && !isHoliday;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const nyTimeFormatted = `${pad(ny.hour)}:${pad(ny.minute)}:${pad(ny.second)} ET`;
  const nyDateFormatted = ny.dateKey;

  // Regular market: 09:30 (570 min) to 16:00 (960 min) or 13:00 (780 min) on early close days
  const REGULAR_OPEN_MIN = 570; // 9:30 AM
  const REGULAR_CLOSE_MIN = isEarlyClose ? 780 : 960; // 1:00 PM (early close) or 4:00 PM (regular)
  const PRE_MARKET_OPEN_MIN = 240; // 4:00 AM
  const POST_MARKET_CLOSE_MIN = isEarlyClose ? 1020 : 1200; // 5:00 PM on early close, else 8:00 PM
  const TOTAL_SESSION_MIN = REGULAR_CLOSE_MIN - REGULAR_OPEN_MIN; // 210 or 390 minutes

  // Calculate epoch timestamps for today's regular session open and close in America/New_York
  const now = targetDate || new Date();
  const nyTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const nyLocal = new Date(nyTimeString);
  const diffMs = now.getTime() - nyLocal.getTime();

  const closeHour = isEarlyClose ? 13 : 16;
  const openNyLocal = new Date(nyLocal.getFullYear(), nyLocal.getMonth(), nyLocal.getDate(), 9, 30, 0);
  const closeNyLocal = new Date(nyLocal.getFullYear(), nyLocal.getMonth(), nyLocal.getDate(), closeHour, 0, 0);

  const sessionOpenTimestamp = openNyLocal.getTime() + diffMs;
  const sessionCloseTimestamp = closeNyLocal.getTime() + diffMs;

  let status: MarketStatusType = 'CLOSED';
  let statusLabelAr = 'السوق مغلق';
  let statusLabelEn = 'Market Closed';
  let statusColor = '#94A3B8';
  let isRegularOpen = false;
  let isPreMarket = false;
  let isAfterHours = false;
  let sessionProgressPct = 0;
  let sessionMinutesElapsed = 0;
  let nextSessionEventAr = '';
  let nextSessionEventEn = '';

  if (isWeekend) {
    status = 'WEEKEND';
    statusLabelAr = 'عطلة نهاية الأسبوع';
    statusLabelEn = 'Weekend Closed';
    statusColor = '#64748B';
    nextSessionEventAr = 'يفتح السوق الإثنين 09:30 ص ET';
    nextSessionEventEn = 'Opens Monday 09:30 AM ET';
    sessionProgressPct = 100;
  } else if (isHoliday) {
    status = 'HOLIDAY';
    statusLabelAr = `عطلة رسمية (${holidayName})`;
    statusLabelEn = `Holiday: ${holidayName}`;
    statusColor = '#F59E0B';
    nextSessionEventAr = 'يستأنف السوق يوم العمل التالي 09:30 ص ET';
    nextSessionEventEn = 'Resumes next trading day 09:30 AM ET';
    sessionProgressPct = 100;
  } else {
    // Normal Trading Day (or Early Close Day)
    if (ny.totalMinutes < PRE_MARKET_OPEN_MIN) {
      // 00:00 -> 04:00
      status = 'CLOSED';
      statusLabelAr = 'السوق مغلق (جلسة ليلية)';
      statusLabelEn = 'Overnight Closed';
      statusColor = '#64748B';
      const minLeft = PRE_MARKET_OPEN_MIN - ny.totalMinutes;
      nextSessionEventAr = `يفتح التداول المبكر بعد ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
      nextSessionEventEn = `Pre-market opens in ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
      sessionProgressPct = 0;
    } else if (ny.totalMinutes >= PRE_MARKET_OPEN_MIN && ny.totalMinutes < REGULAR_OPEN_MIN) {
      // 04:00 -> 09:30 (Pre-Market)
      status = 'PRE_MARKET';
      isPreMarket = true;
      statusLabelAr = isEarlyClose ? 'ما قبل الافتتاح (إغلاق مبكر 1:00 م)' : 'ما قبل الافتتاح (Pre-Market)';
      statusLabelEn = isEarlyClose ? 'Pre-Market (Early Close 1:00 PM)' : 'Pre-Market Session';
      statusColor = '#F59E0B';
      const minLeft = REGULAR_OPEN_MIN - ny.totalMinutes;
      nextSessionEventAr = `يفتتح السوق الرسمي بعد ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
      nextSessionEventEn = `Regular Market opens in ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
      sessionProgressPct = 0;
    } else if (ny.totalMinutes >= REGULAR_OPEN_MIN && ny.totalMinutes < REGULAR_CLOSE_MIN) {
      // Regular Session Live
      status = 'OPEN';
      isRegularOpen = true;
      statusLabelAr = isEarlyClose ? 'السوق مفتوح (إغلاق مبكر 1:00 م)' : 'السوق مفتوح (جلسة حية)';
      statusLabelEn = isEarlyClose ? 'Regular (Early Close 1:00 PM)' : 'Regular Market (Live)';
      statusColor = '#22C55E';
      sessionMinutesElapsed = ny.totalMinutes - REGULAR_OPEN_MIN + ny.second / 60;
      sessionProgressPct = Math.min(100, Math.max(0, (sessionMinutesElapsed / TOTAL_SESSION_MIN) * 100));

      const minLeft = REGULAR_CLOSE_MIN - ny.totalMinutes;
      nextSessionEventAr = `يغلق السوق الرسمي بعد ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
      nextSessionEventEn = `Regular closes in ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
    } else if (ny.totalMinutes >= REGULAR_CLOSE_MIN && ny.totalMinutes < POST_MARKET_CLOSE_MIN) {
      // After-Hours
      status = 'AFTER_HOURS';
      isAfterHours = true;
      statusLabelAr = 'ما بعد الإغلاق (After-Hours)';
      statusLabelEn = 'After-Hours Session';
      statusColor = '#38BDF8';
      sessionProgressPct = 100;
      sessionMinutesElapsed = TOTAL_SESSION_MIN;
      const minLeft = POST_MARKET_CLOSE_MIN - ny.totalMinutes;
      nextSessionEventAr = `تنتهي جلسة المساء بعد ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
      nextSessionEventEn = `After-hours closes in ${Math.floor(minLeft / 60)}h ${minLeft % 60}m`;
    } else {
      // Post-market closed
      status = 'CLOSED';
      statusLabelAr = 'السوق مغلق';
      statusLabelEn = 'Market Closed';
      statusColor = '#64748B';
      sessionProgressPct = 100;
      sessionMinutesElapsed = TOTAL_SESSION_MIN;
      nextSessionEventAr = 'يفتح التداول المبكر غداً 04:00 ص ET';
      nextSessionEventEn = 'Pre-market opens tomorrow 04:00 AM ET';
    }
  }

  return {
    status,
    statusLabelAr,
    statusLabelEn,
    statusColor,
    nyTimeFormatted,
    nyDateFormatted,
    nyHour: ny.hour,
    nyMinute: ny.minute,
    nySecond: ny.second,
    totalMinutesInDay: ny.totalMinutes,
    isTradingDay,
    isRegularOpen,
    isPreMarket,
    isAfterHours,
    sessionProgressPct: Number(sessionProgressPct.toFixed(1)),
    sessionMinutesElapsed: Math.round(sessionMinutesElapsed),
    sessionMinutesTotal: TOTAL_SESSION_MIN,
    sessionOpenTimeFormatted: '09:30 AM ET',
    sessionCloseTimeFormatted: isEarlyClose ? '01:00 PM ET' : '04:00 PM ET',
    nextSessionEventAr,
    nextSessionEventEn,
    sessionOpenTimestamp,
    sessionCloseTimestamp,
  };
}

/**
 * Parses timeframe strings like '1m', '2m', '5m', '10m', '15m', '30m', '1h', '1D', '5D', '1M', '1Y'
 * into interval minutes for intraday bar aggregation.
 */
export function parseTimeframeToMinutes(tf: string): number {
  const clean = (tf || '5m').trim().toLowerCase();
  if (clean === '1m' || clean === '1') return 1;
  if (clean === '2m' || clean === '2') return 2;
  if (clean === '5m' || clean === '5') return 5;
  if (clean === '10m' || clean === '10') return 10;
  if (clean === '15m' || clean === '15') return 15;
  if (clean === '30m' || clean === '30') return 30;
  if (clean === '1h' || clean === '60m' || clean === '60') return 60;
  if (clean === '1d') return 5; // Default 5m candles for 1-day intraday view
  return 5;
}

/**
 * Aggregates high-frequency ticks or raw points into precise aligned intraday OHLCV candles
 * starting strictly at 09:30 AM ET with ongoing live candle formation.
 */
export function aggregateCandlesByInterval(
  ticks: { timestamp: number; price: number; volume?: number }[],
  intervalMinutes: number,
  sessionOpenSec: number
): ChartDataPoint[] {
  if (!ticks || ticks.length === 0) return [];

  const intervalSec = Math.max(60, intervalMinutes * 60);
  const buckets = new Map<number, {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
  }>();

  for (const tick of ticks) {
    const sec = Math.floor(tick.timestamp / 1000);
    // Align to bucket start from session open
    const offsetFromOpen = sec - sessionOpenSec;
    const bucketIndex = offsetFromOpen >= 0 ? Math.floor(offsetFromOpen / intervalSec) : Math.floor(sec / intervalSec);
    const bucketTimestamp = offsetFromOpen >= 0 ? sessionOpenSec + bucketIndex * intervalSec : bucketIndex * intervalSec;

    const existing = buckets.get(bucketTimestamp);
    if (!existing) {
      buckets.set(bucketTimestamp, {
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume || 100,
        timestamp: bucketTimestamp * 1000,
      });
    } else {
      existing.high = Math.max(existing.high, tick.price);
      existing.low = Math.min(existing.low, tick.price);
      existing.close = tick.price;
      existing.volume += tick.volume || 100;
    }
  }

  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
  return sortedKeys.map((k) => {
    const b = buckets.get(k)!;
    const dateObj = new Date(b.timestamp);
    const dateStr = dateObj.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return {
      timestamp: b.timestamp,
      date: dateStr,
      open: Number(b.open.toFixed(2)),
      high: Number(b.high.toFixed(2)),
      low: Number(b.low.toFixed(2)),
      close: Number(b.close.toFixed(2)),
      volume: Math.round(b.volume),
    };
  });
}

/**
 * Builds the strictly aligned 09:30 -> 16:00 Intraday Session Series.
 * Points are spaced according to timeframe (e.g. 5m = 78 bars total for regular session).
 * Only bars up to the current progress time are populated with real/simulated prices.
 */
export function buildLiveSessionTimelineData(
  stock: StockItem | StockQuote,
  intervalMinutes: number = 5,
  progressRatio: number = 1.0, // 0.0 to 1.0
  sessionType: MarketSessionType = 'REGULAR'
): {
  candles: ChartDataPoint[];
  sessionOpenSec: number;
  sessionCloseSec: number;
  totalBarsInSession: number;
  activeBarsCount: number;
  currentPrice: number;
} {
  const currentPrice = Number(stock.price || 100);
  const prevClose = Number(stock.previousClose || currentPrice * 0.985);
  const dayOpen = Number(stock.open || prevClose);
  const highVal = 'dayHigh' in stock ? stock.dayHigh : stock.high;
  const lowVal = 'dayLow' in stock ? stock.dayLow : stock.low;
  const dayHigh = Number(highVal || Math.max(currentPrice, dayOpen) * 1.018);
  const dayLow = Number(lowVal || Math.min(currentPrice, dayOpen) * 0.982);
  const totalVolume = Number(stock.volume || 1500000);

  const sessionState = computeMarketSessionState();
  const sessionOpenSec = Math.floor(sessionState.sessionOpenTimestamp / 1000);
  const sessionCloseSec = Math.floor(sessionState.sessionCloseTimestamp / 1000);

  const stepSec = Math.max(60, intervalMinutes * 60);
  const totalSessionSec = sessionCloseSec - sessionOpenSec; // 390 * 60 = 23,400 sec
  const totalBarsInSession = Math.floor(totalSessionSec / stepSec); // e.g. 78 bars for 5m

  // Active count based on progressRatio (clamped between 1 and totalBarsInSession)
  const clampedProgress = Math.max(0.01, Math.min(1.0, progressRatio));
  const activeBarsCount = Math.max(1, Math.floor(totalBarsInSession * clampedProgress));

  // Deterministic noise generator based on symbol
  let seed = 0;
  for (let i = 0; i < (stock.symbol || 'SYM').length; i++) {
    seed = (seed << 5) - seed + (stock.symbol || 'SYM').charCodeAt(i);
    seed |= 0;
  }
  const pseudoRand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const candles: ChartDataPoint[] = [];
  let runningPrice = dayOpen;

  for (let i = 0; i < activeBarsCount; i++) {
    const barProgress = activeBarsCount > 1 ? i / (activeBarsCount - 1) : 1;
    const barTimestampSec = sessionOpenSec + i * stepSec;
    const barTimestampMs = barTimestampSec * 1000;

    // Time-formatted string in NY ET
    const dateObj = new Date(barTimestampMs);
    const dateStr = dateObj.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Realistic price evolution from dayOpen towards currentPrice with intraday volatility
    const trendTarget = dayOpen + (currentPrice - dayOpen) * barProgress;
    const wave = Math.sin(barProgress * Math.PI * 3 + (seed % 7)) * ((dayHigh - dayLow) * 0.18);
    const microNoise = (pseudoRand() - 0.49) * ((dayHigh - dayLow) * 0.08);

    let barClose = trendTarget + wave + microNoise;
    if (i === activeBarsCount - 1) {
      barClose = currentPrice;
    }
    barClose = Math.max(dayLow * 0.995, Math.min(dayHigh * 1.005, barClose));

    const spread = Math.abs(barClose) * 0.0035;
    const barHighVal = Math.max(runningPrice, barClose) + spread * pseudoRand();
    const barLowVal = Math.min(runningPrice, barClose) - spread * pseudoRand();
    const barVol = Math.round((totalVolume / totalBarsInSession) * (0.6 + pseudoRand() * 0.8));

    candles.push({
      timestamp: barTimestampMs,
      date: dateStr,
      open: Number(runningPrice.toFixed(2)),
      high: Number(barHighVal.toFixed(2)),
      low: Number(barLowVal.toFixed(2)),
      close: Number(barClose.toFixed(2)),
      volume: barVol,
    });

    runningPrice = barClose;
  }

  return {
    candles,
    sessionOpenSec,
    sessionCloseSec,
    totalBarsInSession,
    activeBarsCount,
    currentPrice,
  };
}
