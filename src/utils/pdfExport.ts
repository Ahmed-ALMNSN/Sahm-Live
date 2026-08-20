import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface GeneratePdfOptions {
  fileName?: string;
  elementId?: string;
  title?: string;
}

/**
 * Captures an HTML element and exports it as an Institutional A4 PDF document.
 * Maintains pristine aspect ratio, typography, and page splits.
 */
export async function exportElementToPdf(
  elementOrId: HTMLElement | string,
  options: GeneratePdfOptions = {}
): Promise<boolean> {
  try {
    const targetElement = typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

    if (!targetElement) {
      console.error('[PDF Export] Target element not found');
      return false;
    }

    // Scroll to top of target before capture to prevent cutoff
    const originalScroll = targetElement.scrollTop;
    targetElement.scrollTop = 0;

    // Capture using html2canvas with high scale for crisp institutional typography
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: targetElement.scrollWidth || 800,
      ignoreElements: (element) => {
        // Ignore loading overlays, spinners, toolbars, and no-print elements
        return (
          element.classList?.contains('no-print') ||
          element.classList?.contains('loading-overlay') ||
          element.getAttribute('aria-busy') === 'true' ||
          element.id === 'report-loading-overlay'
        );
      },
    });

    targetElement.scrollTop = originalScroll;

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const marginX = 8; // 8mm margin
    const marginY = 8;
    const imgWidth = pdfWidth - (marginX * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = marginY;

    // First page
    pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, Math.min(imgHeight, pdfHeight - (marginY * 2)));
    heightLeft -= (pdfHeight - (marginY * 2));

    // Subsequent pages if multi-page report
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + marginY;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - (marginY * 2));
    }

    const defaultFileName = options.fileName || `Sahm_Institutional_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(defaultFileName.endsWith('.pdf') ? defaultFileName : `${defaultFileName}.pdf`);
    return true;
  } catch (error) {
    console.error('[PDF Export Error]:', error);
    return false;
  }
}
