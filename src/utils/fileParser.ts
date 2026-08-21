import * as XLSX from 'xlsx';
import { FileParseResult, ParsedStockData, DetectedColumnsInfo } from '../types.js';

// Recognized column names (case-insensitive & trimmed)
const SYMBOL_COLUMNS = [
  'symbol', 'ticker', 'stock', 'code', 'ticker symbol', 'stock symbol', 'tickersymbol', 'stocksymbol', 'sym',
  'رمز', 'رمز السهم', 'السهم', 'الرمز', 'كود', 'كود السهم', 'رمز_السهم', 'رمز-السهم', 'المؤشر', 'التيكر'
];

const UPPER_ALERT_COLUMNS = [
  'upperalert', 'upper alert', 'upper_alert', 'upper-alert', 'upper', 'alert high', 'high alert', 
  'upper limit', 'upperlimit', 'upper_limit', 'max price', 'maxprice', 'max_price', 'target price', 'target', 
  'take profit', 'tp', 'alert_high', 'high_alert',
  'تنبيه السعر الأعلى', 'الحد الأعلى', 'تنبيه علوي', 'الحد الاعلى', 'السعر الاعلى', 'السعر الأعلى', 
  'تنبيه الحد الأعلى', 'تنبيه الحد الاعلى', 'تنبيه_الحد_الاعلى', 'الهدف', 'الهدف الأول', 'الهدف الاول', 
  'هدف البيع', 'الهدف السعري', 'الحد_الاعلى', 'تنبيه_علوي'
];

const LOWER_ALERT_COLUMNS = [
  'loweralert', 'lower alert', 'lower_alert', 'lower-alert', 'lower', 'alert low', 'low alert', 
  'lower limit', 'lowerlimit', 'lower_limit', 'min price', 'minprice', 'min_price', 'stop loss', 'stoploss', 
  'stop_loss', 'sl', 'stop', 'alert_low', 'low_alert',
  'تنبيه السعر الأدنى', 'الحد الأدنى', 'تنبيه سفلي', 'الحد الادنى', 'السعر الادنى', 'السعر الأدنى', 
  'تنبيه الحد الأدنى', 'تنبيه الحد الادنى', 'تنبيه_الحد_الادنى', 'وقف الخسارة', 'وقف خسارة', 'الوقف', 
  'قاع التنبيه', 'الحد_الادنى', 'تنبيه_سفلي'
];

const COMPANY_COLUMNS = [
  'company', 'name', 'company name', 'companyname', 'company_name', 'stock name', 'stockname', 'description',
  'الشركة', 'اسم الشركة', 'الاسم', 'اسم السهم', 'اسم_الشركة', 'الجهة', 'الشركة_المصدرة'
];

const SECTOR_COLUMNS = [
  'sector', 'industry', 'category', 'group', 'sector_name',
  'القطاع', 'الصناعة', 'التصنيف', 'المجال', 'النشاط'
];

const PRICE_COLUMNS = [
  'price', 'last', 'last price', 'lastprice', 'last_price', 'current price', 'current_price', 'close',
  'السعر', 'السعر الحالي', 'السعر_الحالي', 'الإغلاق', 'الاغلاق'
];

const BUY_PRICE_COLUMNS = [
  'buy price', 'buyprice', 'buy_price', 'entry price', 'entry', 'cost', 'avg cost',
  'سعر الشراء', 'سعر_الشراء', 'الشراء', 'سعر الدخول', 'سعر التكلفة'
];

const SHARES_COLUMNS = [
  'shares', 'quantity', 'qty', 'units', 'volume', 'amount',
  'الكمية', 'عدد الأسهم', 'عدد_الاسهم', 'عدد_الأسهم', 'الاسهم', 'الأسهم'
];

export async function parseStockFile(file: File, sheetIndexOrName?: string | number): Promise<FileParseResult> {
  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxBytes) {
    return {
      success: false,
      stocks: [],
      filename: file.name,
      totalRows: 0,
      validStocksCount: 0,
      duplicateCount: 0,
      ignoredCount: 0,
      error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت). يرجى تقليل حجم الملف والمحاولة مجددًا.',
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    if (extension === 'json') {
      const text = await file.text();
      return parseJsonContent(text, file.name);
    } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
      const buffer = await file.arrayBuffer();
      return parseSpreadsheetBuffer(buffer, file.name, sheetIndexOrName);
    } else {
      return {
        success: false,
        stocks: [],
        filename: file.name,
        totalRows: 0,
        validStocksCount: 0,
        duplicateCount: 0,
        ignoredCount: 0,
        error: `صيغة الملف غير مدعومة (.${extension}). يرجى رفع ملف بتنسيق CSV (.csv) أو Excel (.xlsx, .xls) أو JSON (.json).`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      stocks: [],
      filename: file.name,
      totalRows: 0,
      validStocksCount: 0,
      duplicateCount: 0,
      ignoredCount: 0,
      error: `فشل في قراءة ومعالجة الملف: ${err?.message || 'تنسيق الملف تالف أو غير صالح'}. يرجى التأكد من سلامة ملف CSV / Excel.`,
    };
  }
}

function parseSpreadsheetBuffer(buffer: ArrayBuffer, filename: string, sheetIndexOrName?: string | number): FileParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  if (!sheetNames || sheetNames.length === 0) {
    return {
      success: false,
      stocks: [],
      filename,
      totalRows: 0,
      validStocksCount: 0,
      duplicateCount: 0,
      ignoredCount: 0,
      error: 'ملف الجداول (Spreadsheet) فارغ ولا يحتوي على أي صفحات عمل (Sheets).',
    };
  }

  let selectedSheet = sheetNames[0];
  if (typeof sheetIndexOrName === 'string' && sheetNames.includes(sheetIndexOrName)) {
    selectedSheet = sheetIndexOrName;
  } else if (typeof sheetIndexOrName === 'number' && sheetNames[sheetIndexOrName]) {
    selectedSheet = sheetNames[sheetIndexOrName];
  }

  const worksheet = workbook.Sheets[selectedSheet];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return processRawRows(rawRows, filename, sheetNames, selectedSheet);
}

function parseJsonContent(text: string, filename: string): FileParseResult {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      success: false,
      stocks: [],
      filename,
      totalRows: 0,
      validStocksCount: 0,
      duplicateCount: 0,
      ignoredCount: 0,
      error: 'تنسيق ملف JSON غير صالح (Invalid JSON Syntax). يرجى التأكد من صحة بناء الجملة.',
    };
  }

  let rawRows: any[] = [];

  if (Array.isArray(parsed)) {
    rawRows = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    const candidateKeys = ['stocks', 'data', 'items', 'rows', 'results', 'symbols', 'watchlist', 'tickers'];
    for (const key of candidateKeys) {
      if (Array.isArray(parsed[key])) {
        rawRows = parsed[key];
        break;
      }
    }

    if (rawRows.length === 0) {
      const values = Object.values(parsed);
      if (values.length > 0 && typeof values[0] === 'object') {
        rawRows = values as any[];
      }
    }
  }

  return processRawRows(rawRows, filename);
}

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
}

function processRawRows(
  rawRows: any[], 
  filename: string, 
  sheetNames?: string[], 
  selectedSheet?: string
): FileParseResult {
  if (!rawRows || rawRows.length === 0) {
    return {
      success: false,
      stocks: [],
      filename,
      totalRows: 0,
      validStocksCount: 0,
      duplicateCount: 0,
      ignoredCount: 0,
      sheetNames,
      selectedSheet,
      error: 'تنسيق الملف غير صحيح: الملف فارغ أو لا يحتوي على صفوف بيانات صالحة.',
    };
  }

  const seenSymbols = new Set<string>();
  const validStocks: ParsedStockData[] = [];
  let duplicateCount = 0;
  let ignoredCount = 0;

  // Track detected column mappings
  const detectedColumns: DetectedColumnsInfo = {};

  // Inspect first row keys to record detected column headers
  if (rawRows.length > 0 && typeof rawRows[0] === 'object' && rawRows[0] !== null) {
    const firstRowKeys = Object.keys(rawRows[0]);
    for (const key of firstRowKeys) {
      const norm = normalizeKey(key);
      if (SYMBOL_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.symbolCol) {
        detectedColumns.symbolCol = key;
      } else if (UPPER_ALERT_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.upperAlertCol) {
        detectedColumns.upperAlertCol = key;
      } else if (LOWER_ALERT_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.lowerAlertCol) {
        detectedColumns.lowerAlertCol = key;
      } else if (COMPANY_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.companyCol) {
        detectedColumns.companyCol = key;
      } else if (SECTOR_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.sectorCol) {
        detectedColumns.sectorCol = key;
      } else if (PRICE_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.priceCol) {
        detectedColumns.priceCol = key;
      } else if (BUY_PRICE_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.buyPriceCol) {
        detectedColumns.buyPriceCol = key;
      } else if (SHARES_COLUMNS.some(c => normalizeKey(c) === norm) && !detectedColumns.sharesCol) {
        detectedColumns.sharesCol = key;
      }
    }
  }

  for (const row of rawRows) {
    if (!row) {
      ignoredCount++;
      continue;
    }

    let symbol = '';
    let companyName = '';
    let sector = '';
    let price: number | undefined = undefined;
    let upperAlert: number | null = null;
    let lowerAlert: number | null = null;
    let buyPrice: number | null = null;
    let shares: number | null = null;

    if (typeof row === 'string') {
      symbol = row;
    } else if (typeof row === 'object') {
      for (const [rawKey, val] of Object.entries(row)) {
        const key = normalizeKey(rawKey);
        const strVal = String(val ?? '').trim();

        if (SYMBOL_COLUMNS.some(c => normalizeKey(c) === key) && !symbol) {
          symbol = strVal;
        } else if (UPPER_ALERT_COLUMNS.some(c => normalizeKey(c) === key) && upperAlert === null) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) upperAlert = num;
        } else if (LOWER_ALERT_COLUMNS.some(c => normalizeKey(c) === key) && lowerAlert === null) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) lowerAlert = num;
        } else if (COMPANY_COLUMNS.some(c => normalizeKey(c) === key) && !companyName) {
          companyName = strVal;
        } else if (SECTOR_COLUMNS.some(c => normalizeKey(c) === key) && !sector) {
          sector = strVal;
        } else if (PRICE_COLUMNS.some(c => normalizeKey(c) === key) && price === undefined) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) price = num;
        } else if (BUY_PRICE_COLUMNS.some(c => normalizeKey(c) === key) && buyPrice === null) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) buyPrice = num;
        } else if (SHARES_COLUMNS.some(c => normalizeKey(c) === key) && shares === null) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) shares = num;
        }
      }

      // If symbol not found by exact key match, check direct key lookup or first value
      if (!symbol) {
        if (row.Symbol || row.symbol || row.SYMBOL || row.Ticker || row.ticker) {
          symbol = String(row.Symbol || row.symbol || row.SYMBOL || row.Ticker || row.ticker).trim();
        } else {
          const firstVal = Object.values(row)[0];
          if (typeof firstVal === 'string' && /^[A-Za-z0-9.\-=]{1,10}$/.test(firstVal.trim())) {
            symbol = firstVal;
          }
        }
      }
    }

    // Clean and validate symbol
    const cleanSym = symbol.trim().toUpperCase().replace(/[\s\r\n\t]/g, '');
    
    // Validate US Stock symbols (allow standard formats e.g. AAPL, BRK.B, BRK-B)
    if (!cleanSym || !/^[A-Z0-9.\-=]{1,10}$/.test(cleanSym) || cleanSym.length < 1) {
      ignoredCount++;
      continue;
    }

    if (seenSymbols.has(cleanSym)) {
      duplicateCount++;
      continue;
    }

    seenSymbols.add(cleanSym);
    validStocks.push({
      symbol: cleanSym,
      companyName: companyName || cleanSym,
      sector: sector || undefined,
      price,
      upperAlert,
      lowerAlert,
      buyPrice,
      shares,
    });
  }

  let errorMessage: string | undefined = undefined;
  if (validStocks.length === 0) {
    errorMessage = 'تنسيق الملف غير صحيح: لم يتم العثور على أي رموز أسهم صالحة. يرجى التأكد من احتواء الملف على عمود رمز السهم (Symbol / Ticker) وأعمدة التنبيهات (UpperAlert, LowerAlert).';
  }

  return {
    success: validStocks.length > 0,
    stocks: validStocks,
    filename,
    totalRows: rawRows.length,
    validStocksCount: validStocks.length,
    duplicateCount,
    ignoredCount,
    sheetNames,
    selectedSheet,
    detectedColumns,
    error: errorMessage,
  };
}

export function generateSampleCsv(): string {
  return `Symbol,UpperAlert,LowerAlert,CompanyName,Sector
AAPL,245.00,215.00,Apple Inc.,Technology
MSFT,530.00,470.00,Microsoft Corporation,Technology
NVDA,160.00,125.00,NVIDIA Corporation,Semiconductors
AMZN,230.00,195.00,Amazon.com Inc.,Consumer Cyclical
GOOGL,210.00,175.00,Alphabet Inc.,Communication Services
TSLA,310.00,240.00,Tesla Inc.,Automotive
META,680.00,580.00,Meta Platforms,Communication Services
ABEV,3.50,2.60,Ambev S.A.,Consumer Staples
GRAB,4.50,3.10,Grab Holdings,Technology`;
}

