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
