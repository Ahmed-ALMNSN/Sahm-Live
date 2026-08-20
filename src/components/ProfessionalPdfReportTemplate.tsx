import React from 'react';
import { PDFReportTemplate } from './PDFReportTemplate.js';
import { ProfessionalReportData } from '../utils/reportEngine.js';
import { Language } from '../types.js';

interface ProfessionalPdfReportTemplateProps {
  report: any;
  lang: Language;
}

export const ProfessionalPdfReportTemplate: React.FC<ProfessionalPdfReportTemplateProps> = ({
  report,
  lang,
}) => {
  return (
    <PDFReportTemplate
      report={report as ProfessionalReportData}
      lang={lang}
      containerId="institutional-pdf-export-container"
    />
  );
};
