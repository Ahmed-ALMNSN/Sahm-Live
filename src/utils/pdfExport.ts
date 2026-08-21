import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface GeneratePdfOptions {
  fileName?: string;
  elementId?: string;
  title?: string;
  backgroundColor?: string | null;
}

/**
 * Captures an HTML element and exports it as an Institutional A4 PDF document.
 * Supports modern CSS colors including oklch, lab, and lch.
 * Ensures pristine Arabic text connectivity (prevents broken/isolated letters).
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

    // Ensure all web fonts (especially Arabic Cairo font) are fully loaded before rendering
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // Fallback gracefully if document.fonts is not available
      }
    }

    // Scroll to top of target before capture to prevent cutoff
    const originalScroll = targetElement.scrollTop;
    targetElement.scrollTop = 0;

    // Capture using html2canvas-pro with high scale for crisp institutional typography
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: options.backgroundColor !== undefined ? options.backgroundColor : '#ffffff',
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
      onclone: (clonedDoc, clonedTarget) => {
        // Inject comprehensive Arabic typography styles into the cloned document
        // to guarantee proper Arabic ligature shaping and eliminate disconnected letters
        const style = clonedDoc.createElement('style');
        style.id = 'pdf-arabic-typography-fix';
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

          *, *::before, *::after {
            letter-spacing: normal !important;
            word-spacing: normal !important;
            font-feature-settings: "liga" 1, "dlig" 1, "calt" 1, "kern" 1 !important;
            text-rendering: geometricPrecision !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
          }

          html, body, div, span, p, h1, h2, h3, h4, h5, h6, table, thead, tbody, tr, th, td, label, button, input {
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }

          .font-mono, .font-mono-num {
            font-family: 'JetBrains Mono', 'Cairo', monospace !important;
            letter-spacing: normal !important;
          }

          /* Force override of any tracking classes that break Arabic ligatures */
          .tracking-tighter,
          .tracking-tight,
          .tracking-normal,
          .tracking-wide,
          .tracking-wider,
          .tracking-widest {
            letter-spacing: normal !important;
          }

          /* White paper background for crisp institutional print */
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
        `;
        clonedDoc.head.appendChild(style);

        // Ensure cloned body and target element have direction and proper font
        if (clonedDoc.body) {
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.color = '#0f172a';
          clonedDoc.body.style.letterSpacing = 'normal';
        }

        if (clonedTarget) {
          clonedTarget.style.letterSpacing = 'normal';
        }
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

/**
 * Universal Print & PDF trigger that guarantees flawless printing even inside
 * sandboxed iframe environments or desktop browsers.
 * If direct iframe print is restricted by browser security policies,
 * it automatically falls back seamlessly to high-resolution PDF download.
 */
export async function printHtmlElement(
  elementOrId: HTMLElement | string,
  options: { title?: string; fileName?: string; fallbackToPdf?: boolean } = {}
): Promise<{ success: boolean; mode: 'print' | 'pdf' }> {
  const targetElement = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!targetElement) {
    console.error('[Print Element] Element not found');
    return { success: false, mode: 'print' };
  }

  const reportTitle = options.title || 'Sahm_Market_Report';
  const isArabic = targetElement.getAttribute('dir') === 'rtl' || targetElement.getAttribute('lang') === 'ar' || document.documentElement.dir === 'rtl';

  try {
    // 1. Create a clean isolated hidden iframe to isolate the printable content
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Unable to access iframe document');
    }

    // Collect all existing stylesheets from the host document
    const headStyles: string[] = [];
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      headStyles.push(node.outerHTML);
    });

    const contentHtml = targetElement.outerHTML;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="utf-8">
          <title>${reportTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
          ${headStyles.join('\n')}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 10mm 10mm 10mm;
            }
            *, *::before, *::after {
              letter-spacing: normal !important;
              word-spacing: normal !important;
              font-feature-settings: "liga" 1, "dlig" 1, "calt" 1 !important;
              box-sizing: border-box;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
              font-size: 10.5pt !important;
              line-height: 1.5 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .font-mono {
              font-family: 'JetBrains Mono', monospace !important;
            }
            .no-print, button, nav, footer {
              display: none !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            th, td {
              border: 1px solid #cbd5e1 !important;
              padding: 6px 10px !important;
            }
            th {
              background-color: #f1f5f9 !important;
              font-weight: bold !important;
            }
          </style>
        </head>
        <body class="bg-white text-slate-900">
          <div class="print-container">
            ${contentHtml}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Allow fonts and stylesheets to settle in the iframe
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (iframeDoc.fonts) {
      try {
        await iframeDoc.fonts.ready;
      } catch {
        // Continue if fonts check fails
      }
    }

    let printed = false;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      printed = true;
    } catch (printError) {
      console.warn('[Print] Native iframe print was blocked or failed:', printError);
      printed = false;
    }

    // Cleanup iframe after a short delay
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {
        // Ignore cleanup error
      }
    }, 2000);

    if (printed) {
      return { success: true, mode: 'print' };
    }

    // If direct print was blocked by sandbox, export to PDF automatically
    const fileName = options.fileName || `${reportTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfOk = await exportElementToPdf(targetElement, { fileName });
    return { success: pdfOk, mode: 'pdf' };

  } catch (error) {
    console.warn('[Print] Falling back to high-res PDF generation due to exception:', error);
    const fileName = options.fileName || `${reportTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfOk = await exportElementToPdf(targetElement, { fileName });
    return { success: pdfOk, mode: 'pdf' };
  }
}


