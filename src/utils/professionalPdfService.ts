import { generateProfessionalReport, ProfessionalReportData } from './reportEngine.js';
import { StockItem, Language } from '../types.js';

export interface ReportGenerationProgress {
  isGenerating: boolean;
  stageIndex: number;
  totalStages: number;
  stepText: string;
  isComplete: boolean;
  report: ProfessionalReportData | null;
}

/**
 * Runs sequential 10-stage quantitative and fundamental analysis:
 * 1. Collects live stock data & order book
 * 2. Analyzes price action
 * 3. Technical & momentum indicators
 * 4. Fundamental & income statements
 * 5. Cash flows & balance sheet audit
 * 6. Liquidity, volume & institutional dynamics
 * 7. Risk calculation & factors
 * 8. Entry zones, stop loss, and targets
 * 9. Synthesizes recommendation & scoring
 * 10. Builds complete institutional report
 */
export async function executeReportGenerationFlow(
  stock: StockItem,
  fullData: any,
  lang: Language,
  sharesInput: number | undefined,
  setProgress: (state: ReportGenerationProgress) => void
): Promise<ProfessionalReportData | null> {
  const isAr = lang === 'ar';
  const totalStages = 10;

  try {
    // Stage 1
    setProgress({
      isGenerating: true,
      stageIndex: 1,
      totalStages,
      stepText: isAr ? 'جاري جمع بيانات السهم والجلسة الحية...' : 'Collecting live stock and session data...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 280));

    // Stage 2
    setProgress({
      isGenerating: true,
      stageIndex: 2,
      totalStages,
      stepText: isAr ? 'جاري تحليل حركة السعر ونطاق التداول...' : 'Analyzing price action and session range...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 260));

    // Stage 3
    setProgress({
      isGenerating: true,
      stageIndex: 3,
      totalStages,
      stepText: isAr ? 'جاري تحليل المؤشرات الفنية ومستويات الزخم...' : 'Running technical and momentum indicators (EMA, RSI, MACD)...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 300));

    // Stage 4
    setProgress({
      isGenerating: true,
      stageIndex: 4,
      totalStages,
      stepText: isAr ? 'جاري تحليل القوائم المالية والأرباح...' : 'Auditing financial statements and earnings quality...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 300));

    // Stage 5
    setProgress({
      isGenerating: true,
      stageIndex: 5,
      totalStages,
      stepText: isAr ? 'جاري تحليل التدفقات النقدية والملاءة المالية...' : 'Analyzing cash flows, liquidity, and balance sheet debt...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 280));

    // Stage 6
    setProgress({
      isGenerating: true,
      stageIndex: 6,
      totalStages,
      stepText: isAr ? 'جاري تقييم السيولة والحجم والنشاط المؤسسي...' : 'Evaluating volume dynamics (RVOL) and institutional flow...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 280));

    // Stage 7
    setProgress({
      isGenerating: true,
      stageIndex: 7,
      totalStages,
      stepText: isAr ? 'جاري حساب المخاطر ومعدلات التذبذب...' : 'Calculating volatility and risk factors...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 280));

    // Stage 8
    setProgress({
      isGenerating: true,
      stageIndex: 8,
      totalStages,
      stepText: isAr ? 'جاري حساب مستويات الدخول ووقف الخسارة والأهداف...' : 'Calculating optimal entry, stop loss, and targets (T1/T2/T3)...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 300));

    // Stage 9
    setProgress({
      isGenerating: true,
      stageIndex: 9,
      totalStages,
      stepText: isAr ? 'جاري إعداد التوصية والتقييم المؤسسي النهائي...' : 'Synthesizing final institutional recommendation and scoring...',
      isComplete: false,
      report: null,
    });
    await new Promise((r) => setTimeout(r, 280));

    // Stage 10: Generate full object
    const finalReport = generateProfessionalReport(stock, fullData, sharesInput);

    setProgress({
      isGenerating: true,
      stageIndex: 10,
      totalStages,
      stepText: isAr ? 'جاري إنشاء وتنسيق التقرير المؤسسي...' : 'Building final research dossier layout...',
      isComplete: true,
      report: finalReport,
    });
    await new Promise((r) => setTimeout(r, 400));

    // Reset progress
    setProgress({
      isGenerating: false,
      stageIndex: 10,
      totalStages,
      stepText: '',
      isComplete: false,
      report: finalReport,
    });

    return finalReport;
  } catch (err) {
    console.error('Report Generation Flow error:', err);
    setProgress({
      isGenerating: false,
      stageIndex: 1,
      totalStages,
      stepText: isAr ? 'حدث خطأ أثناء إعداد التقرير.' : 'Error generating report.',
      isComplete: false,
      report: null,
    });
    return null;
  }
}
