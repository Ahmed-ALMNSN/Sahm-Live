import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  Layers,
  Sparkles
} from 'lucide-react';
import { Language, FileParseResult, ParsedStockData } from '../types.js';
import { getTranslation } from '../i18n/index.js';
import { parseStockFile, generateSampleCsv } from '../utils/fileParser.js';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onImportStocks: (stocks: ParsedStockData[], filename: string) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  lang,
  onImportStocks,
}) => {
  const t = getTranslation(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<FileParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFile = async (file: File, sheetName?: string) => {
    setIsProcessing(true);
    setCurrentFile(file);
    const result = await parseStockFile(file, sheetName);
    setParseResult(result);
    if (result.sheetNames && result.sheetNames.length > 0) {
      setSelectedSheet(sheetName || result.sheetNames[0]);
    }
    setIsProcessing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!currentFile) return;
    setSelectedSheet(sheetName);
    await handleFile(currentFile, sheetName);
  };

  const handleConfirm = () => {
    if (parseResult && parseResult.stocks.length > 0) {
      onImportStocks(parseResult.stocks, parseResult.filename);
      onClose();
    }
  };

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_stocks.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans"
    >
      <div className="bg-[#0f1115] rounded-xl border border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                {t.uploadModal.title}
              </h2>
              <p className="text-xs text-slate-400">
                {t.uploadModal.supportedFormats}
              </p>
            </div>
          </div>

          <button
            id="btn-close-upload-modal"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]'
                : 'border-slate-700 hover:border-emerald-500/80 bg-[#161b22]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls, .json"
              onChange={handleInputChange}
              className="hidden"
            />

            <div className="flex items-center gap-3 text-slate-400">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
              <FileCode className="w-7 h-7 text-blue-400" />
              <FileText className="w-7 h-7 text-amber-400" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                {t.uploadModal.dropzoneTitle}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {t.uploadModal.maxSize}
              </p>
            </div>

            <button
              type="button"
              className="px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-[#0a0b0d] text-slate-200 border border-slate-700 hover:border-slate-500 transition-all"
            >
              {t.uploadModal.selectFileBtn}
            </button>
          </div>

          {/* Sample CSV Download Link */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-[#161b22] p-2.5 rounded border border-slate-800 font-mono">
            <span>{t.uploadModal.supportedFormats}</span>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-1 font-bold text-emerald-400 hover:underline text-[11px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.uploadModal.sampleTemplate}</span>
            </button>
          </div>

          {/* Sheet Selector if multiple sheets exist */}
          {parseResult?.sheetNames && parseResult.sheetNames.length > 1 && (
            <div className="flex items-center gap-3 p-2.5 bg-[#161b22] rounded border border-slate-800">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono text-slate-300">
                {t.uploadModal.sheetSelect}
              </span>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="bg-[#0a0b0d] text-xs font-mono font-bold px-2 py-1 rounded border border-slate-700 text-white outline-none"
              >
                {parseResult.sheetNames.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error Display */}
          {parseResult?.error && (
            <div className="flex items-start gap-2.5 p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseResult.error}</span>
            </div>
          )}

          {/* Parse Result Summary & Preview */}
          {parseResult && parseResult.success && (
            <div className="space-y-3">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded bg-[#161b22] border border-slate-800 text-center">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {parseResult.validStocksCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                    {t.uploadModal.stocksDetected}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#161b22] border border-slate-800 text-center">
                  <div className="text-base font-bold font-mono text-amber-400">
                    {parseResult.duplicateCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                    {t.uploadModal.duplicatesRemoved}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#161b22] border border-slate-800 text-center">
                  <div className="text-base font-bold font-mono text-slate-400">
                    {parseResult.ignoredCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                    {t.uploadModal.invalidIgnored}
                  </div>
                </div>
              </div>

              {/* Tickers Preview Chips */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  {t.uploadModal.previewTitle}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded bg-[#0a0b0d] border border-slate-800">
                  {parseResult.stocks.map((s) => (
                    <div
                      key={s.symbol}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#161b22] border border-slate-700 text-slate-200"
                    >
                      <span>{s.symbol}</span>
                      {s.upperAlert && (
                        <span className="text-[10px] text-emerald-400">↗${s.upperAlert}</span>
                      )}
                      {s.lowerAlert && (
                        <span className="text-[10px] text-rose-400">↘${s.lowerAlert}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#161b22] border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-mono font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors uppercase tracking-wider"
          >
            {t.actions.cancel}
          </button>

          <button
            type="button"
            id="btn-confirm-import"
            disabled={!parseResult || !parseResult.success || parseResult.stocks.length === 0 || isProcessing}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white shadow-sm transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.uploadModal.confirmImport}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
