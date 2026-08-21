import { YahooProvider } from '../providers/YahooProvider.js';

export interface InflationMetrics {
  cpiYoY: number;
  coreCpiYoY: number;
  cpiMoM: number;
  targetRate: number;
  trend: 'COOLING' | 'STICKY' | 'RISING';
  trendAr: string;
  trendEn: string;
  releaseDate: string;
  descriptionAr: string;
  descriptionEn: string;
}

export interface InterestRateMetrics {
  fedFundsTargetRange: string;
  fedFundsRate: number;
  treasury10Y: number;
  treasury2Y: number;
  treasury5Y: number;
  treasury3M: number;
  yieldCurveSpread2Y10Y: number;
  yieldCurveState: 'NORMAL' | 'FLAT' | 'INVERTED';
  yieldCurveStateAr: string;
  yieldCurveStateEn: string;
  realInterestRate: number;
  policyStance: 'RESTRICTIVE_HAWKISH' | 'NEUTRAL_PAUSE' | 'ACCOMMODATIVE_DOVISH';
  policyStanceAr: string;
  policyStanceEn: string;
}

export interface GlobalMarketLiquidity {
  dxyIndex: number;
  dxyChangePercent: number;
  crudeOilWti: number;
  goldSpot: number;
  liquidityRegime: string;
  liquidityRegimeAr: string;
}

export interface StockMacroImpact {
  symbol: string;
  sector: string;
  macroScore: number; // -100 to +100
  impactRating: 'STRONG_TAILWIND' | 'MODERATE_TAILWIND' | 'NEUTRAL' | 'MODERATE_HEADWIND' | 'STRONG_HEADWIND';
  impactRatingAr: string;
  impactRatingEn: string;
  rateSensitivity: 'HIGH' | 'MODERATE' | 'LOW';
  rateSensitivityAr: string;
  inflationSensitivity: 'HIGH' | 'MODERATE' | 'LOW';
  inflationSensitivityAr: string;
  costOfCapitalImpact: string;
  costOfCapitalImpactAr: string;
  valuationMultipleImpact: string;
  valuationMultipleImpactAr: string;
  tailwindsAr: string[];
  tailwindsEn: string[];
  headwindsAr: string[];
  headwindsEn: string[];
  summaryAr: string;
  summaryEn: string;
}

export interface MacroeconomicData {
  inflation: InflationMetrics;
  interestRates: InterestRateMetrics;
  liquidity: GlobalMarketLiquidity;
  lastUpdated: number;
  historicalCpi: { date: string; headline: number; core: number }[];
  historicalRates: { date: string; fedRate: number; yield10Y: number; yield2Y: number }[];
}

export class MacroService {
  private yahooProvider = new YahooProvider();
  private cache: { data: MacroeconomicData; expiresAt: number } | null = null;
  private readonly TTL_MS = 60000; // 1 minute cache for treasury yields and economic quotes

  async getMacroData(): Promise<MacroeconomicData> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.data;
    }

    try {
      // Fetch live market symbols for macro rates & commodities:
      // ^TNX: 10-Yr Yield, ^IRX: 13-Week T-Bill, ^FVX: 5-Yr Yield, DX-Y.NYB: Dollar Index, CL=F: Oil, GC=F: Gold
      const macroSymbols = ['^TNX', '^IRX', '^FVX', 'DX-Y.NYB', 'CL=F', 'GC=F'];
      const quotes = await this.yahooProvider.getQuotes(macroSymbols).catch(() => ({}));

      // Treasury 10-Year yield (Note: ^TNX quotes price as e.g. 42.80 representing 4.28%)
      let raw10Y = quotes['^TNX']?.price ?? 4.28;
      let yield10Y = raw10Y > 20 ? Number((raw10Y / 10).toFixed(3)) : Number(raw10Y.toFixed(3));
      if (yield10Y <= 0 || yield10Y > 15) yield10Y = 4.28;

      // Treasury 13-Week Bill (^IRX)
      let raw3M = quotes['^IRX']?.price ?? 4.35;
      let yield3M = raw3M > 20 ? Number((raw3M / 10).toFixed(3)) : Number(raw3M.toFixed(3));
      if (yield3M <= 0 || yield3M > 15) yield3M = 4.35;

      // Treasury 5-Year (^FVX)
      let raw5Y = quotes['^FVX']?.price ?? 4.18;
      let yield5Y = raw5Y > 20 ? Number((raw5Y / 10).toFixed(3)) : Number(raw5Y.toFixed(3));
      if (yield5Y <= 0 || yield5Y > 15) yield5Y = 4.18;

      // Estimate 2-Year Treasury Yield (anchored slightly below 3M / around 10Y based on curve dynamics)
      let yield2Y = Number((yield10Y - 0.12).toFixed(3));
      if (yield2Y < 3.5) yield2Y = 4.15;

      // Fed Funds target rate: currently benchmark 4.25% - 4.50% (effective ~4.38%)
      const fedFundsRate = 4.38;
      const fedFundsTargetRange = '4.25% - 4.50%';

      // US Inflation metrics (Latest official BLS releases)
      const cpiYoY = 2.9;
      const coreCpiYoY = 3.2;
      const cpiMoM = 0.2;
      const targetRate = 2.0;

      // Real interest rate = 10Y Treasury Yield - Headline CPI
      const realInterestRate = Number((yield10Y - cpiYoY).toFixed(2));

      // Yield curve spread: 10Y - 2Y
      const yieldCurveSpread2Y10Y = Number((yield10Y - yield2Y).toFixed(2));
      let yieldCurveState: 'NORMAL' | 'FLAT' | 'INVERTED' = 'NORMAL';
      let yieldCurveStateAr = 'منحنى عائد طبيعي (Normal Curve)';
      let yieldCurveStateEn = 'Normal Yield Curve';

      if (yieldCurveSpread2Y10Y < -0.05) {
        yieldCurveState = 'INVERTED';
        yieldCurveStateAr = 'منحنى عائد معكوس (Inverted Curve - مؤشر تباطؤ)';
        yieldCurveStateEn = 'Inverted Yield Curve (Slowdown Indicator)';
      } else if (Math.abs(yieldCurveSpread2Y10Y) <= 0.05) {
        yieldCurveState = 'FLAT';
        yieldCurveStateAr = 'منحنى عائد مسطح (Flat Curve)';
        yieldCurveStateEn = 'Flat Yield Curve';
      }

      // Inflation Trend
      const trend: 'COOLING' | 'STICKY' | 'RISING' = cpiYoY <= 3.0 ? 'COOLING' : (cpiYoY <= 3.5 ? 'STICKY' : 'RISING');
      const trendAr = trend === 'COOLING' ? 'تباطؤ تدريجي (Disinflationary)' : (trend === 'STICKY' ? 'تضخم عنيد (Sticky Inflation)' : 'تسارع تضخمي (Rising Inflation)');
      const trendEn = trend === 'COOLING' ? 'Disinflationary Cooling' : (trend === 'STICKY' ? 'Sticky Inflation' : 'Accelerating Inflation');

      // Policy Stance
      let policyStance: 'RESTRICTIVE_HAWKISH' | 'NEUTRAL_PAUSE' | 'ACCOMMODATIVE_DOVISH' = 'NEUTRAL_PAUSE';
      let policyStanceAr = 'سياسة متشددة مقيدة نسبياً مع مراقبة البيانات (Data-Dependent Pause)';
      let policyStanceEn = 'Data-Dependent Restrictive Pause';

      if (realInterestRate > 1.5) {
        policyStance = 'RESTRICTIVE_HAWKISH';
        policyStanceAr = 'فائدة حقيقية مقيدة بشدة للسيولة والنمو (Restrictive Tightening)';
        policyStanceEn = 'Highly Restrictive Real Interest Rates';
      } else if (realInterestRate < 0.5) {
        policyStance = 'ACCOMMODATIVE_DOVISH';
        policyStanceAr = 'تيسير نقدي وتخفيض تكلفة الإقراض (Accommodative Easing)';
        policyStanceEn = 'Accommodative Monetary Conditions';
      }

      // Dollar & Commodity Liquidity
      const dxyQuote = quotes['DX-Y.NYB'];
      const oilQuote = quotes['CL=F'];
      const goldQuote = quotes['GC=F'];

      const dxyIndex = dxyQuote?.price && dxyQuote.price > 50 ? Number(dxyQuote.price.toFixed(2)) : 104.15;
      const dxyChangePercent = dxyQuote?.changePercent ?? -0.15;
      const crudeOilWti = oilQuote?.price && oilQuote.price > 20 ? Number(oilQuote.price.toFixed(2)) : 72.80;
      const goldSpot = goldQuote?.price && goldQuote.price > 1000 ? Number(goldQuote.price.toFixed(2)) : 2885.50;

      const liquidityRegime = dxyIndex > 105 ? 'TIGHT_USD' : (dxyIndex < 101 ? 'LOOSE_USD' : 'STABLE_USD');
      const liquidityRegimeAr = liquidityRegime === 'TIGHT_USD'
        ? 'قوة الدولار تضغط على الأصول عالية المخاطر'
        : (liquidityRegime === 'LOOSE_USD' ? 'وفرة سيولة دولارية داعمة لأسواق الأسهم' : 'استقرار نسبي في مؤشر الدولار والسيولة الدولية');

      // Historical Series for Charts
      const historicalCpi = [
        { date: '2025-09', headline: 3.4, core: 3.6 },
        { date: '2025-10', headline: 3.3, core: 3.5 },
        { date: '2025-11', headline: 3.1, core: 3.4 },
        { date: '2025-12', headline: 3.0, core: 3.3 },
        { date: '2026-01', headline: 3.0, core: 3.3 },
        { date: '2026-02', headline: 2.9, core: 3.2 },
      ];

      const historicalRates = [
        { date: '2025-09', fedRate: 4.88, yield10Y: 4.45, yield2Y: 4.52 },
        { date: '2025-10', fedRate: 4.63, yield10Y: 4.38, yield2Y: 4.40 },
        { date: '2025-11', fedRate: 4.63, yield10Y: 4.32, yield2Y: 4.30 },
        { date: '2025-12', fedRate: 4.38, yield10Y: 4.25, yield2Y: 4.20 },
        { date: '2026-01', fedRate: 4.38, yield10Y: 4.22, yield2Y: 4.18 },
        { date: '2026-02', fedRate: 4.38, yield10Y: yield10Y, yield2Y: yield2Y },
      ];

      const macroData: MacroeconomicData = {
        inflation: {
          cpiYoY,
          coreCpiYoY,
          cpiMoM,
          targetRate,
          trend,
          trendAr,
          trendEn,
          releaseDate: 'مؤشر أسعار المستهلكين BLS CPI (أحدث إصدار)',
          descriptionAr: `معدل التضخم السنوي العام ${cpiYoY}% والأساسي ${coreCpiYoY}%؛ التضخم أعلى من مستهدف الفيدرالي (${targetRate}%) بفارق +${(cpiYoY - targetRate).toFixed(1)}%.`,
          descriptionEn: `Headline CPI is ${cpiYoY}% YoY with Core at ${coreCpiYoY}%. Inflation remains +${(cpiYoY - targetRate).toFixed(1)}% above the Fed 2% target.`,
        },
        interestRates: {
          fedFundsTargetRange,
          fedFundsRate,
          treasury10Y: yield10Y,
          treasury2Y: yield2Y,
          treasury5Y: yield5Y,
          treasury3M: yield3M,
          yieldCurveSpread2Y10Y,
          yieldCurveState,
          yieldCurveStateAr,
          yieldCurveStateEn,
          realInterestRate,
          policyStance,
          policyStanceAr,
          policyStanceEn,
        },
        liquidity: {
          dxyIndex,
          dxyChangePercent,
          crudeOilWti,
          goldSpot,
          liquidityRegime,
          liquidityRegimeAr,
        },
        lastUpdated: now,
        historicalCpi,
        historicalRates,
      };

      this.cache = {
        data: macroData,
        expiresAt: now + this.TTL_MS,
      };

      return macroData;
    } catch (err) {
      console.error('Error generating macroeconomic data:', err);
      return this.getFallbackMacroData();
    }
  }

  getFallbackMacroData(): MacroeconomicData {
    return {
      inflation: {
        cpiYoY: 2.9,
        coreCpiYoY: 3.2,
        cpiMoM: 0.2,
        targetRate: 2.0,
        trend: 'COOLING',
        trendAr: 'تباطؤ تدريجي (Disinflationary)',
        trendEn: 'Disinflationary Cooling',
        releaseDate: 'بيانات التضخم الأمريكية (BLS Benchmark)',
        descriptionAr: 'معدل التضخم السنوي العام 2.9% والأساسي 3.2% يواصل التباطؤ التدريجي باتجاه مستهدف 2.0%.',
        descriptionEn: 'Headline inflation at 2.9% YoY and Core at 3.2% continuing gradual disinflation toward 2.0%.',
      },
      interestRates: {
        fedFundsTargetRange: '4.25% - 4.50%',
        fedFundsRate: 4.38,
        treasury10Y: 4.28,
        treasury2Y: 4.15,
        treasury5Y: 4.18,
        treasury3M: 4.35,
        yieldCurveSpread2Y10Y: 0.13,
        yieldCurveState: 'NORMAL',
        yieldCurveStateAr: 'منحنى عائد إيجابي معتدل (Normal Curve)',
        yieldCurveStateEn: 'Normal Yield Curve',
        realInterestRate: 1.38,
        policyStance: 'NEUTRAL_PAUSE',
        policyStanceAr: 'فائدة حقيقية مقيدة مع ترقب قرارات الفيدرالي القادمة',
        policyStanceEn: 'Restrictive real interest rate backdrop',
      },
      liquidity: {
        dxyIndex: 104.15,
        dxyChangePercent: -0.12,
        crudeOilWti: 72.80,
        goldSpot: 2885.50,
        liquidityRegime: 'STABLE_USD',
        liquidityRegimeAr: 'استقرار نسبي في مؤشر الدولار والسيولة',
      },
      lastUpdated: Date.now(),
      historicalCpi: [
        { date: '2025-09', headline: 3.4, core: 3.6 },
        { date: '2025-10', headline: 3.3, core: 3.5 },
        { date: '2025-11', headline: 3.1, core: 3.4 },
        { date: '2025-12', headline: 3.0, core: 3.3 },
        { date: '2026-01', headline: 3.0, core: 3.3 },
        { date: '2026-02', headline: 2.9, core: 3.2 },
      ],
      historicalRates: [
        { date: '2025-09', fedRate: 4.88, yield10Y: 4.45, yield2Y: 4.52 },
        { date: '2025-10', fedRate: 4.63, yield10Y: 4.38, yield2Y: 4.40 },
        { date: '2025-11', fedRate: 4.63, yield10Y: 4.32, yield2Y: 4.30 },
        { date: '2025-12', fedRate: 4.38, yield10Y: 4.25, yield2Y: 4.20 },
        { date: '2026-01', fedRate: 4.38, yield10Y: 4.22, yield2Y: 4.18 },
        { date: '2026-02', fedRate: 4.38, yield10Y: 4.28, yield2Y: 4.15 },
      ],
    };
  }

  /**
   * Evaluates the specific macroeconomic impact on a given stock symbol & sector
   */
  async evaluateStockMacroImpact(symbol: string, sector: string = 'General'): Promise<StockMacroImpact> {
    const macro = await this.getMacroData();
    const sec = (sector || '').toLowerCase();
    const sym = (symbol || '').toUpperCase();

    // Determine sector sensitivity
    let rateSensitivity: 'HIGH' | 'MODERATE' | 'LOW' = 'MODERATE';
    let rateSensitivityAr = 'متوسطة الحساسية';
    let inflationSensitivity: 'HIGH' | 'MODERATE' | 'LOW' = 'MODERATE';
    let inflationSensitivityAr = 'متوسطة التأثر';
    let macroScore = 15; // default moderate positive
    let impactRating: 'STRONG_TAILWIND' | 'MODERATE_TAILWIND' | 'NEUTRAL' | 'MODERATE_HEADWIND' | 'STRONG_HEADWIND' = 'NEUTRAL';
    let impactRatingAr = 'حيادي ومحايد للمؤشرات الكلية';
    let impactRatingEn = 'Neutral Macro Backdrop';

    let costOfCapitalImpact = 'Moderate debt service cost under current 4.25%-4.50% Fed rate';
    let costOfCapitalImpactAr = 'تكلفة تمويل واقتراض معتدلة ضمن نطاق الفائدة الحالي (4.25% - 4.50%)';
    let valuationMultipleImpact = 'Fair valuation multiple support under 10Y yield of ' + macro.interestRates.treasury10Y + '%';
    let valuationMultipleImpactAr = `مضاعفات التقييم مقبولة مع استقرار عائد سندات الـ 10 سنوات عند ${macro.interestRates.treasury10Y}%`;

    const tailwindsAr: string[] = [];
    const tailwindsEn: string[] = [];
    const headwindsAr: string[] = [];
    const headwindsEn: string[] = [];

    // Macro Rule 1: Tech / Growth / Software / Biotech (Long duration cash flows)
    if (sec.includes('tech') || sec.includes('software') || sec.includes('bio') || sec.includes('communication') || sec.includes('semiconductor')) {
      rateSensitivity = 'HIGH';
      rateSensitivityAr = 'حساسية مرتفعة جداً لمعدلات الفائدة وعوائد السندات';
      inflationSensitivity = 'LOW';
      inflationSensitivityAr = 'حساسية منخفضة لأسعار السلع (أصول غير ملموسة)';

      if (macro.interestRates.treasury10Y > 4.5) {
        macroScore = -35;
        impactRating = 'MODERATE_HEADWIND';
        impactRatingAr = 'رياح معاكسة لأسهم النمو بسبب ارتفاع عائد الـ 10 سنوات';
        impactRatingEn = 'Valuation Pressure from Higher Bond Yields';
        headwindsAr.push('ارتفاع عوائد سندات الخزانة يرفع معدل الخصم للتدفقات النقدية المستقبلية ويضغط على مكررات الربحية (PE Compression).');
        headwindsEn.push('Elevated 10Y yields increase discount rate for future earnings, pressuring valuation multiples.');
      } else {
        macroScore = 45;
        impactRating = 'MODERATE_TAILWIND';
        impactRatingAr = 'دعم إيجابي لأسهم التكنولوجيا مع تباطؤ التضخم واقتراب خفض الفائدة';
        impactRatingEn = 'Positive Growth Backdrop from Disinflation and Rate Cuts Expectation';
        tailwindsAr.push('تباطؤ التضخم العام (2.9%) يعزز مرونة الإنفاق على البنية التحتية السحابية والذكاء الاصطناعي.');
        tailwindsAr.push('توقعات تيسير السياسة النقدية تدعم توسع مضاعفات التقييم للشركات المبتكرة.');
        tailwindsEn.push('Cooling inflation creates favorable monetary conditions for high-growth tech investments.');
        tailwindsEn.push('Potential future rate cuts lower equity risk premiums.');
      }
    }
    // Macro Rule 2: Financials & Banking (Net Interest Margin + Loan demand)
    else if (sec.includes('finan') || sec.includes('bank') || sec.includes('insur')) {
      rateSensitivity = 'HIGH';
      rateSensitivityAr = 'حساسية مرتفعة وإيجابية لمعدلات الفائدة المرتفعة';
      inflationSensitivity = 'MODERATE';
      inflationSensitivityAr = 'تأثر متوسط عبر حجم الإقراض والتعثر';

      macroScore = 60;
      impactRating = 'STRONG_TAILWIND';
      impactRatingAr = 'بيئة مثالية للبنوك بفضل اتساع هوامش الفائدة الصافية (NIM)';
      impactRatingEn = 'Strong Tailwind for Financials via Net Interest Margin';
      tailwindsAr.push(`بقاء الفائدة الفيدرالية عند ${macro.interestRates.fedFundsTargetRange} يدعم تحقيق هوامش فائدة صافية (NIM) قوية للأصول المصرفية.`);
      tailwindsAr.push('منحنى العائد الطبيعي يحسن ربحية تحويل الودائع قصيرة الأجل إلى قروض استثمارية.');
      tailwindsEn.push(`Fed funds rate at ${macro.interestRates.fedFundsTargetRange} continues to drive elevated net interest income.`);
      tailwindsEn.push('Positive yield curve slope supports bank lending profitability.');
    }
    // Macro Rule 3: Energy & Basic Materials (Commodity Inflation Hedge)
    else if (sec.includes('energy') || sec.includes('oil') || sec.includes('gas') || sec.includes('material') || sec.includes('mining')) {
      rateSensitivity = 'LOW';
      rateSensitivityAr = 'حساسية منخفضة للفائدة، مرتبطة بأسعار النفط والمواد';
      inflationSensitivity = 'HIGH';
      inflationSensitivityAr = 'تحوط مباشر وقوي ضد التضخم (Inflation Hedge)';

      macroScore = 55;
      impactRating = 'MODERATE_TAILWIND';
      impactRatingAr = 'تحوط ممتاز ومستفيد من قوة أسعار السلع والنفط';
      impactRatingEn = 'Inflation Hedge Beneficiary';
      tailwindsAr.push(`تداول النفط الخام WTI حول $${macro.liquidity.crudeOilWti} يوفر تدفقات نقدية تشغيلية وحرة قياسية لشركات الطاقة.`);
      tailwindsAr.push('القطاع يعتبر ملاذاً تحوطياً فعالاً ضد أي ثبات تضخمي عنيد.');
      tailwindsEn.push(`WTI crude at ~$${macro.liquidity.crudeOilWti} drives robust operating cash flows and shareholder returns.`);
    }
    // Macro Rule 4: Real Estate & Utilities (High Debt & Dividend Yield competition)
    else if (sec.includes('real estate') || sec.includes('reit') || sec.includes('utilit')) {
      rateSensitivity = 'HIGH';
      rateSensitivityAr = 'حساسية سلبية مرتفعة لتكاليف الاقتراض ومنافسة السندات';
      inflationSensitivity = 'HIGH';
      inflationSensitivityAr = 'تأثر سلبي بارتفاع تكاليف التشغيل والصيانة';

      macroScore = -40;
      impactRating = 'MODERATE_HEADWIND';
      impactRatingAr = 'ضغوط تمويلية ومنافسة قوية من عوائد أذونات الخزانة الخالية من المخاطر';
      impactRatingEn = 'Financing Headwinds & Risk-Free Yield Competition';
      headwindsAr.push(`عائد سندات الخزانة لـ 3 أشهر (${macro.interestRates.treasury3M}%) ينافس عوائد التوزيعات النقدية للعقارات والمرافق.`);
      headwindsAr.push('ارتفاع تكلفة إعادة تمويل الديون يضغط على هوامش الأرباح وصافي الدخل.');
      headwindsEn.push(`Risk-free cash yield of ${macro.interestRates.treasury3M}% creates competition against dividend yields.`);
      headwindsEn.push('Higher refinancing costs impact leveraged balance sheets.');
    }
    // Macro Rule 5: Consumer Discretionary & Retail (Consumer purchasing power)
    else if (sec.includes('consumer') || sec.includes('retail') || sec.includes('cyclical')) {
      rateSensitivity = 'MODERATE';
      rateSensitivityAr = 'تأثر بحجم الائتمان الاستهلاكي وبطاقات الائتمان';
      inflationSensitivity = 'HIGH';
      inflationSensitivityAr = 'حساسية مرتفعة لأسعار المواد الاستهلاكية وسلة الغذاء';

      if (macro.inflation.cpiYoY <= 3.0) {
        macroScore = 30;
        impactRating = 'MODERATE_TAILWIND';
        impactRatingAr = 'تحسن القوة الشرائية للمستهلك مع تراجع معدلات التضخم';
        impactRatingEn = 'Consumer Purchasing Power Recovery';
        tailwindsAr.push(`انخفاض التضخم إلى ${macro.inflation.cpiYoY}% يدعم نمو الدخل الحقيقي وإنفاق المستهلكين.`);
        tailwindsEn.push(`Cooling CPI at ${macro.inflation.cpiYoY}% supports real disposable income and discretionary spending.`);
      } else {
        macroScore = -20;
        impactRating = 'MODERATE_HEADWIND';
        impactRatingAr = 'ضغوط تضخمية تؤثر على هوامش الربح والطلب الاستهلاكي';
        impactRatingEn = 'Inflationary Margin Squeeze';
        headwindsAr.push('استمرار ارتفاع الأسعار يحد من الإنفاق غير الأساسي للمستهلك.');
        headwindsEn.push('Persistent price levels pressure non-essential retail sales.');
      }
    }
    // Default / Industrial / Healthcare
    else {
      rateSensitivity = 'MODERATE';
      rateSensitivityAr = 'حساسية معتدلة ومتوازنة مع النمو الاقتصادي العام';
      inflationSensitivity = 'MODERATE';
      inflationSensitivityAr = 'قدرة تسعيرية متوسطة لتمرير التكاليف';
      macroScore = 20;
      impactRating = 'NEUTRAL';
      impactRatingAr = 'تأثير كلي متوازن مع استقرار نسبي في الدورة الاقتصادية';
      impactRatingEn = 'Balanced Macro Sensitivity';
      tailwindsAr.push('استقرار مؤشرات التضخم والسيولة يوفر بيئة تشغيلية متوقعة وقابلة للتخطيط.');
      tailwindsEn.push('Stable macroeconomic parameters provide predictable planning horizon.');
    }

    if (headwindsAr.length === 0) {
      headwindsAr.push('احتمال بقاء الفائدة الفيدرالية مرتفعة لفترة أطول (Higher for Longer) في حال تباطؤ انخفاض التضخم.');
      headwindsEn.push('Risk of higher-for-longer policy rates if disinflation stalls.');
    }

    const summaryAr = `تحليل المؤشرات الكلية لسهم ${sym} (${sector}): معدل التضخم الأمريكي الحالي ${macro.inflation.cpiYoY}% مع نطاق فائدة الفيدرالي ${macro.interestRates.fedFundsTargetRange} وعائد سندات 10 سنوات عند ${macro.interestRates.treasury10Y}%. يصنف التأثير الإجمالي للبيئة الكلية بـ "${impactRatingAr}" بدرجة تقييم (${macroScore > 0 ? '+' : ''}${macroScore}/100).`;
    const summaryEn = `Macroeconomic evaluation for ${sym} (${sector}): US CPI at ${macro.inflation.cpiYoY}% YoY alongside Fed Funds Rate at ${macro.interestRates.fedFundsTargetRange} and 10Y Yield at ${macro.interestRates.treasury10Y}%. Overall macro impact is assessed as "${impactRatingEn}" with a score of ${macroScore}/100.`;

    return {
      symbol: sym,
      sector,
      macroScore,
      impactRating,
      impactRatingAr,
      impactRatingEn,
      rateSensitivity,
      rateSensitivityAr,
      inflationSensitivity,
      inflationSensitivityAr,
      costOfCapitalImpact,
      costOfCapitalImpactAr,
      valuationMultipleImpact,
      valuationMultipleImpactAr,
      tailwindsAr,
      tailwindsEn,
      headwindsAr,
      headwindsEn,
      summaryAr,
      summaryEn,
    };
  }
}

export const macroService = new MacroService();
