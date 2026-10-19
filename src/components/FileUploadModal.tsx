import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Download,
  ArrowRight,
} from 'lucide-react';
import type { ComplaintRecord } from '../types/triage';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newRecords: ComplaintRecord[]) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [complaintCol, setComplaintCol] = useState<string>('');
  const [sourceCol, setSourceCol] = useState<string>('');
  const [idCol, setIdCol] = useState<string>('');
  const [deptCol, setDeptCol] = useState<string>('');
  const [dateCol, setDateCol] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (fileToParse: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
        });

        if (json.length === 0) {
          setErrorMsg('The selected spreadsheet has no data rows.');
          setIsProcessing(false);
          return;
        }

        const keys = Object.keys(json[0]);
        setHeaders(keys);
        setRawRows(json);

        // Auto-detect columns
        const findMatch = (terms: string[]) =>
          keys.find((k) => terms.some((t) => k.toLowerCase().includes(t))) || '';

        const autoComplaint = findMatch([
          'complaint',
          'feedback',
          'comment',
          'message',
          'grievance',
          'review',
          'text',
          'description',
          'issue',
        ]);
        const autoSource = findMatch(['source', 'channel', 'origin', 'type']);
        const autoId = findMatch(['id', 'reference', 'ref', 'number', 'case']);
        const autoDept = findMatch(['dept', 'department', 'unit', 'clinic', 'service']);
        const autoDate = findMatch(['date', 'received', 'timestamp', 'created']);

        setComplaintCol(autoComplaint || keys[0] || '');
        setSourceCol(autoSource);
        setIdCol(autoId);
        setDeptCol(autoDept);
        setDateCol(autoDate);
        setIsProcessing(false);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to parse file. Please upload a valid CSV or Excel file.');
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(fileToParse);
  };

  const handleImport = () => {
    if (!complaintCol) {
      setErrorMsg('Please select which column contains the complaint or grievance text.');
      return;
    }

    const records: ComplaintRecord[] = rawRows.reduce<ComplaintRecord[]>((acc, row, index) => {
      const rawText = String(row[complaintCol] || '').trim();
      if (!rawText) return acc;

      const id = idCol && row[idCol] ? String(row[idCol]) : `IMP-${Date.now()}-${index + 1}`;
      const sourceChannel =
        sourceCol && row[sourceCol] ? String(row[sourceCol]) : 'Uploaded File';
      const patientRef =
        idCol && row[idCol] ? String(row[idCol]) : `Case #${index + 1}`;
      const departmentTag = deptCol && row[deptCol] ? String(row[deptCol]) : undefined;
      const dateReceived =
        dateCol && row[dateCol]
          ? String(row[dateCol])
          : new Date().toISOString().split('T')[0];

      acc.push({
        id,
        rawText,
        sourceChannel,
        patientRef,
        departmentTag,
        dateReceived,
        status: 'pending',
      });
      return acc;
    }, []);

    if (records.length === 0) {
      setErrorMsg('No valid complaints found in the selected column.');
      return;
    }

    onImport(records);
    onClose();
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Complaint ID': 'GRV-101',
        'Source Channel': 'Patient Portal',
        'Date Received': '2026-10-19',
        'Department / Clinic': 'Emergency Department',
        'Complaint Details':
          'Nurse failed to check patient allergy band and brought a syringe containing cephalosporin. Patient alerted the charge nurse immediately.',
      },
      {
        'Complaint ID': 'GRV-102',
        'Source Channel': 'Discharge Survey',
        'Date Received': '2026-10-18',
        'Department / Clinic': 'Billing Office',
        'Complaint Details':
          'Received surprise out-of-network balance bill of $1,800 despite having prior in-network pre-authorization.',
      },
      {
        'Complaint ID': 'GRV-103',
        'Source Channel': 'Press Ganey',
        'Date Received': '2026-10-17',
        'Department / Clinic': 'Cardiology Clinic',
        'Complaint Details':
          'Appointment was delayed 90 minutes. Staff at front desk were unhelpful and did not update anyone in the waiting lobby.',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
    XLSX.writeFile(wb, 'Healthcare_Complaints_Template.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Upload Complaints Data Source</h2>
              <p className="text-xs text-slate-400">Import CSV or Excel (.xlsx, .xls) for automated clinical triage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-6 text-center cursor-pointer transition bg-slate-800/40 hover:bg-slate-800/70"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <FileSpreadsheet className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
            <div className="text-sm font-medium text-white">
              {file ? file.name : 'Click or drag CSV or Excel file here'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supports .csv, .xlsx, .xls with multiple complaint rows
            </p>
          </div>

          {/* Download Sample Button */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span>Need a formatted file?</span>
            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Download Excel Sample Template
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Column Mapping Section */}
          {headers.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Map Spreadsheet Columns
                </span>
                <span className="text-xs text-teal-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {rawRows.length} rows detected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Complaint / Feedback Text <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={complaintCol}
                    onChange={(e) => setComplaintCol(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Select column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Source Channel (Portal, Survey, Review)
                  </label>
                  <select
                    value={sourceCol}
                    onChange={(e) => setSourceCol(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Optional (Defaults to Uploaded File)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Complaint ID / Case Ref
                  </label>
                  <select
                    value={idCol}
                    onChange={(e) => setIdCol(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Optional (Auto-generated)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Department / Unit
                  </label>
                  <select
                    value={deptCol}
                    onChange={(e) => setDeptCol(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Optional</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              {rawRows.length > 0 && complaintCol && (
                <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="text-slate-400 font-medium mb-1">First Row Preview:</div>
                  <div className="text-slate-200 line-clamp-2 italic">
                    "{String(rawRows[0][complaintCol] || '')}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || !complaintCol || isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-sm transition"
          >
            <span>Import {rawRows.length > 0 ? `${rawRows.length} Grievances` : 'File'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
