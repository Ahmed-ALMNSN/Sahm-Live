import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface GeneratePdfOptions {
  fileName?: string;
  elementId?: string;
  title?: string;
}

/**
 * Captures an HTML element and exports it as a high-resolution PDF document.
 * Supports multi-page splitting for long analytical reports.
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

    // Capture using html2canvas with high scale for crisp text
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: targetElement.scrollWidth || 1200,
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

    const imgWidth = pdfWidth - 20; // 10mm margins on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10; // 10mm top margin

    // First page
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, Math.min(imgHeight, pdfHeight - 20));
    heightLeft -= (pdfHeight - 20);

    // Subsequent pages if long report
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
    }

    const defaultFileName = options.fileName || `Sahm_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(defaultFileName.endsWith('.pdf') ? defaultFileName : `${defaultFileName}.pdf`);
    return true;
  } catch (error) {
    console.error('[PDF Export Error]:', error);
    return false;
  }
}
