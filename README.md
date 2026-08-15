# Sahm Live Stock Monitor | المتابعة الحية للأسهم

A real-time, production-ready Full-Stack US Stock Monitoring and Crossing Price Alerts Terminal built with React, Vite, Node.js, Express, and Tailwind CSS with full Arabic (RTL) & English (LTR) localization.

---

## 🌟 Key Features

1. **Live High-Frequency Stock Quotes**:
   - Resilient provider architecture (`YahooProvider`, `FinnhubProvider`) with fast TTL server-side caching (3-5s).
   - Batch Quote Engine (`POST /api/quotes/batch`) chunking requests into blocks up to 100 tickers.
   - Prevents overlapping requests with request locking and `AbortController`.

2. **Accurate Edge-Crossing Alert Logic**:
   - **Upper Alert**: Triggers strictly when price crosses from below threshold to at or above threshold. Subsequent ticks above target do not repeat alerts until price drops back down.
   - **Lower Alert**: Triggers strictly when price crosses from above threshold to at or below threshold.
   - Per-stock toggle to enable/disable alerts without stopping market data polling.
   - Audio synthesized chimes via Web Audio API.
   - Native Web Browser Notifications (`Notification API`) with direct click-to-view navigation.
   - In-app interactive toast notifications and detailed persistent Alert History.

3. **Multi-Format File Importer**:
   - In-browser client parsing of `.csv`, `.xlsx`, `.xls`, and `.json`.
   - Automatic column recognition for Ticker/Symbol (Arabic & English headers), Company, Sector, Price, Upper Alert, Lower Alert.
   - Sheet selector for Excel workbooks with multiple tabs.
   - Sanitization: whitespace trimming, uppercasing, US ticker regex validation, duplicate removal, invalid row discarding.
   - Sample CSV generator and instant import summary.

4. **Market Terminal Dashboard**:
   - Market Status indicator (Pre-Market, Market Open, After-Hours, Market Closed).
   - KPI metrics: Monitored Stocks, Advancing Stocks, Declining Stocks, Active Alert Rules, Triggered Events, Auto-refresh timer.
   - Live Financial Table with sticky headers, sorting, search filtering, inline alert editing, and price flash animations.
   - Interactive Recharts technical chart with 1D, 5D, 1M, 3M, 6M, 1Y views, SMA 20, SMA 50 overlays, and visual alert threshold reference lines.
   - Full dark and light modes with seamless persistence in `localStorage`.
   - Native Arabic typography with **Cairo** font and RTL/LTR switching.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts, XLSX parser.
- **Backend API**: Node.js, Express, Helmet, CORS, Express-Rate-Limit.
- **Data Layer**: Yahoo Finance HTTPS engine & Finnhub provider abstraction with fallback and local storage persistence.

```text
React (Client-side file parser & alert crossing state machine)
   ↓
Express REST API (/api/quotes/batch, /api/quote/:symbol, /api/chart/:symbol, /api/health)
   ↓
Market Service (In-memory TTL Cache + Concurrency limiter)
   ↓
Market Provider Layer (Yahoo Finance / Finnhub)
```

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```
- App URL: `http://localhost:3000` (or `http://localhost:5173` if running Vite standalone)
- Express API: `http://localhost:3000/api/health`

### 3. Production Build & Start
```bash
npm run build
npm start
```

---

## 📡 API Endpoints

- `GET /api/health`: Health status and service uptime.
- `GET /api/quote/:symbol`: Real-time quote for a single ticker.
- `POST /api/quotes/batch`: Batch quotes for up to 100 symbols per request (`{ "symbols": ["AAPL", "NVDA", "MSFT"] }`).
- `GET /api/chart/:symbol?range=1M&interval=1d`: Historical chart candles and technical indicators.
- `GET /api/profile/:symbol`: Company fundamentals and profile summary.
- `GET /api/alerts/history`: Retrieve triggered alerts log.
- `POST /api/alerts/history`: Record a new triggered alert event.
- `DELETE /api/alerts/history/:id`: Delete a single alert history record.
- `DELETE /api/alerts/history`: Clear all alert history.

---

## ⚙️ Environment Variables (`.env`)

```env
PORT=3000
NODE_ENV=development
DEFAULT_MARKET_PROVIDER=yahoo
FINNHUB_API_KEY=
```

---

## 📄 Example CSV File

```csv
Ticker,Company,Sector,Upper Alert,Lower Alert
AAPL,Apple Inc.,Technology,245.00,215.00
MSFT,Microsoft Corporation,Technology,540.00,470.00
NVDA,NVIDIA Corporation,Semiconductors,160.00,120.00
ABEV,Ambev S.A.,Consumer Staples,3.50,2.60
GRAB,Grab Holdings,Technology,4.60,3.20
```
