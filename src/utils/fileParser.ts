import * as XLSX from 'xlsx';
import { FileParseResult, ParsedStockData } from '../types.js';

// Recognized column names (case-insensitive & trimmed)
const SYMBOL_COLUMNS = [
  'ticker', 'symbol', 'stock', 'code', 'ticker symbol', 'stock symbol',
  'رمز', 'رمز السهم', 'السهم', 'الرمز', 'كود'
];

const COMPANY_COLUMNS = [
  'company', 'name', 'company name', 'companyname', 'stock name', 'description',
  'الشركة', 'اسم الشركة', 'الاسم', 'اسم السهم'
];

const SECTOR_COLUMNS = [
  'sector', 'industry', 'category', 'group',
  'القطاع', 'الصناعة', 'التصنيف'
];

const UPPER_ALERT_COLUMNS = [
  'upper alert', 'upper', 'alert high', 'high alert', 'upper limit', 'max price',
  'تنبيه السعر الأعلى', 'الحد الأعلى', 'تنبيه علوي', 'الحد الاعلى'
];

const LOWER_ALERT_COLUMNS = [
  'lower alert', 'lower', 'alert low', 'low alert', 'lower limit', 'min price',
  'تنبيه السعر الأدنى', 'الحد الأدنى', 'تنبيه سفلي', 'الحد الادنى'
];

const PRICE_COLUMNS = [
  'price', 'last', 'last price', 'current price', 'close',
  'السعر', 'السعر الحالي', 'الإغلاق'
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
      error: 'File size exceeds maximum allowed 10MB limit',
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
        error: `Unsupported file format .${extension}. Please use .csv, .xlsx, .xls, or .json`,
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
      error: err?.message || 'Failed to parse the file',
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
      error: 'The spreadsheet contains no sheets',
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
  const parsed = JSON.parse(text);
  let rawRows: any[] = [];

  if (Array.isArray(parsed)) {
    rawRows = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Look for common nested array keys: stocks, data, items, rows, results, symbols, watchlist
    const candidateKeys = ['stocks', 'data', 'items', 'rows', 'results', 'symbols', 'watchlist', 'tickers'];
    for (const key of candidateKeys) {
      if (Array.isArray(parsed[key])) {
        rawRows = parsed[key];
        break;
      }
    }

    if (rawRows.length === 0) {
      // Check if values are symbols or objects
      const values = Object.values(parsed);
      if (values.length > 0 && typeof values[0] === 'object') {
        rawRows = values as any[];
      }
    }
  }

  return processRawRows(rawRows, filename);
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
      error: 'No data rows found in the file',
    };
  }

  const seenSymbols = new Set<string>();
  const validStocks: ParsedStockData[] = [];
  let duplicateCount = 0;
  let ignoredCount = 0;

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

    if (typeof row === 'string') {
      symbol = row;
    } else if (typeof row === 'object') {
      for (const [rawKey, val] of Object.entries(row)) {
        const key = rawKey.trim().toLowerCase();
        const strVal = String(val ?? '').trim();

        if (SYMBOL_COLUMNS.includes(key) && !symbol) {
          symbol = strVal;
        } else if (COMPANY_COLUMNS.includes(key) && !companyName) {
          companyName = strVal;
        } else if (SECTOR_COLUMNS.includes(key) && !sector) {
          sector = strVal;
        } else if (PRICE_COLUMNS.includes(key) && price === undefined) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) price = num;
        } else if (UPPER_ALERT_COLUMNS.includes(key) && upperAlert === null) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) upperAlert = num;
        } else if (LOWER_ALERT_COLUMNS.includes(key) && lowerAlert === null) {
          const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) lowerAlert = num;
        }
      }

      // If symbol not found by key name, check first string field
      if (!symbol) {
        const firstVal = Object.values(row)[0];
        if (typeof firstVal === 'string') {
          symbol = firstVal;
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
    });
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
    error: validStocks.length === 0 ? 'No valid stock ticker symbols found in file' : undefined,
  };
}

export function generateSampleCsv(): string {
  return `Ticker,Company,Sector,Upper Alert,Lower Alert
AAPL,Apple Inc.,Technology,245.00,215.00
MSFT,Microsoft Corporation,Technology,530.00,470.00
NVDA,NVIDIA Corporation,Semiconductors,160.00,125.00
AMZN,Amazon.com Inc.,Consumer Cyclical,230.00,195.00
GOOGL,Alphabet Inc.,Communication Services,210.00,175.00
TSLA,Tesla Inc.,Automotive,310.00,240.00
META,Meta Platforms,Communication Services,680.00,580.00
ABEV,Ambev S.A.,Consumer Staples,3.50,2.60
GRAB,Grab Holdings,Technology,4.50,3.10`;
}
