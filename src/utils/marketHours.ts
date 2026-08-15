export type MarketState = 'REGULAR' | 'PRE' | 'POST' | 'CLOSED';

export interface MarketTimeInfo {
  state: MarketState;
  stateLabelAr: string;
  stateLabelEn: string;
  nyTimeFormatted: string;
  nyDateFormatted: string;
  nyDayName: string;
  sessionNoteAr: string;
  sessionNoteEn: string;
  nextEventAr: string;
  nextEventEn: string;
  isTradingDay: boolean;
}

// US Market Holidays checking helper (Month is 1-indexed)
function isUsMarketHoliday(year: number, month: number, day: number): boolean {
  // New Year's Day (Jan 1)
  if (month === 1 && day === 1) return true;
  // Independence Day (Jul 4)
  if (month === 7 && day === 4) return true;
  // Juneteenth (Jun 19)
  if (month === 6 && day === 19) return true;
  // Christmas (Dec 25)
  if (month === 12 && day === 25) return true;
  return false;
}

export function getNyDateTime(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
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

  return {
    year,
    month,
    day,
    weekday,
    hour,
    minute,
    second,
    totalMinutes,
  };
}

export function computeLiveMarketStatus(date: Date = new Date()): MarketTimeInfo {
  const ny = getNyDateTime(date);

  const isWeekend = ny.weekday === 'Sat' || ny.weekday === 'Sun';
  const isHoliday = isUsMarketHoliday(ny.year, ny.month, ny.day);
  const isTradingDay = !isWeekend && !isHoliday;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const nyTimeFormatted = `${pad(ny.hour)}:${pad(ny.minute)}:${pad(ny.second)} ET`;
  const nyDateFormatted = `${ny.year}-${pad(ny.month)}-${pad(ny.day)}`;

  // Market Schedule (minutes from 00:00 ET):
  // 04:00 AM (240 min) -> Pre-Market start
  // 09:30 AM (570 min) -> Regular Session start
  // 04:00 PM (960 min) -> Regular Session close / Post-market start
  // 08:00 PM (1200 min) -> Post-market close / Night closed

  let state: MarketState = 'CLOSED';
  let stateLabelAr = 'السوق مغلق';
  let stateLabelEn = 'Market Closed';
  let sessionNoteAr = 'خارج أوقات التداول';
  let sessionNoteEn = 'Outside trading hours';
  let nextEventAr = '';
  let nextEventEn = '';

  if (!isTradingDay) {
    state = 'CLOSED';
    stateLabelAr = isWeekend ? 'عطلة نهاية الأسبوع (مغلق)' : 'عطلة رسمية (مغلق)';
    stateLabelEn = isWeekend ? 'Weekend (Closed)' : 'Holiday (Closed)';
    sessionNoteAr = 'يستأنف السوق الأمريكي تداولاته يوم الإثنين الساعة 04:00 ص بتوقيت نيويورك';
    sessionNoteEn = 'US markets resume trading Monday at 04:00 AM ET';
    nextEventAr = 'يفتح الإثنين 04:00 ص ET';
    nextEventEn = 'Opens Mon 04:00 AM ET';
  } else {
    // Trading day (Mon - Fri)
    if (ny.totalMinutes >= 240 && ny.totalMinutes < 570) {
      // 04:00 -> 09:30
      state = 'PRE';
      stateLabelAr = 'ما قبل الافتتاح (Pre-Market)';
      stateLabelEn = 'Pre-Market';
      sessionNoteAr = 'تداولات ما قبل الافتتاح الرسمية حتى 09:30 ص بتوقيت نيويورك';
      sessionNoteEn = 'Early trading session until 09:30 AM ET';
      
      const minLeft = 570 - ny.totalMinutes;
      const hLeft = Math.floor(minLeft / 60);
      const mLeft = minLeft % 60;
      nextEventAr = `يفتح السوق الرسمي خلال ${hLeft > 0 ? `${hLeft} ساعة و ` : ''}${mLeft} دقيقة`;
      nextEventEn = `Regular opens in ${hLeft > 0 ? `${hLeft}h ` : ''}${mLeft}m`;
    } else if (ny.totalMinutes >= 570 && ny.totalMinutes < 960) {
      // 09:30 -> 16:00
      state = 'REGULAR';
      stateLabelAr = 'السوق مفتوح (جلسة حية)';
      stateLabelEn = 'Market Open (Live)';
      sessionNoteAr = 'الجلسة الرئيسية للبورصات الأمريكية (NYSE / NASDAQ)';
      sessionNoteEn = 'Main US exchange regular session (NYSE / NASDAQ)';
      
      const minLeft = 960 - ny.totalMinutes;
      const hLeft = Math.floor(minLeft / 60);
      const mLeft = minLeft % 60;
      nextEventAr = `يغلق السوق الرسمي خلال ${hLeft > 0 ? `${hLeft} ساعة و ` : ''}${mLeft} دقيقة`;
      nextEventEn = `Closes in ${hLeft > 0 ? `${hLeft}h ` : ''}${mLeft}m`;
    } else if (ny.totalMinutes >= 960 && ny.totalMinutes < 1200) {
      // 16:00 -> 20:00
      state = 'POST';
      stateLabelAr = 'ما بعد الإغلاق (After-Hours)';
      stateLabelEn = 'After-Hours';
      sessionNoteAr = 'تداولات المساء ما بعد الإغلاق حتى الساعة 20:00 بتوقيت نيويورك';
      sessionNoteEn = 'Post-market extended trading session until 08:00 PM ET';
      
      const minLeft = 1200 - ny.totalMinutes;
      const hLeft = Math.floor(minLeft / 60);
      const mLeft = minLeft % 60;
      nextEventAr = `تنتهي التداولات بعد ${hLeft > 0 ? `${hLeft} ساعة و ` : ''}${mLeft} دقيقة`;
      nextEventEn = `Extended closes in ${hLeft > 0 ? `${hLeft}h ` : ''}${mLeft}m`;
    } else {
      // Overnight (00:00 - 04:00 or 20:00 - 24:00)
      state = 'CLOSED';
      stateLabelAr = 'السوق مغلق (جلسة ليلية)';
      stateLabelEn = 'Market Closed (Night)';
      sessionNoteAr = 'يفتح التداول المبكر (Pre-Market) الساعة 04:00 ص بتوقيت نيويورك';
      sessionNoteEn = 'Pre-market trading opens at 04:00 AM ET';
      
      let minLeft = 0;
      if (ny.totalMinutes < 240) {
        minLeft = 240 - ny.totalMinutes;
      } else {
        minLeft = (24 * 60 - ny.totalMinutes) + 240;
      }
      const hLeft = Math.floor(minLeft / 60);
      const mLeft = minLeft % 60;
      nextEventAr = `يفتح التداول المبكر بعد ${hLeft} ساعة و ${mLeft} دقيقة`;
      nextEventEn = `Pre-market opens in ${hLeft}h ${mLeft}m`;
    }
  }

  return {
    state,
    stateLabelAr,
    stateLabelEn,
    nyTimeFormatted,
    nyDateFormatted,
    nyDayName: ny.weekday,
    sessionNoteAr,
    sessionNoteEn,
    nextEventAr,
    nextEventEn,
    isTradingDay,
  };
}
