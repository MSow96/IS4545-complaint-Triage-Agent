import React, { useState } from 'react';
import { PlusCircle, X, Sparkles, MessageSquare, Building2, User } from 'lucide-react';
import type { ComplaintRecord } from '../types/triage';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: ComplaintRecord, triageImmediately: boolean) => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [rawText, setRawText] = useState('');
  const [sourceChannel, setSourceChannel] = useState('Patient Portal Message');
  const [patientRef, setPatientRef] = useState('');
  const [departmentTag, setDepartmentTag] = useState('');
  const [triageImmediately, setTriageImmediately] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg('Please enter complaint or feedback text.');
      return;
    }

    const newRecord: ComplaintRecord = {
      id: `GRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      rawText: rawText.trim(),
      sourceChannel,
      patientRef: patientRef.trim() || undefined,
      departmentTag: departmentTag.trim() || undefined,
      dateReceived: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    onSubmit(newRecord, triageImmediately);
    setRawText('');
    setPatientRef('');
    setDepartmentTag('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">New Patient Grievance / Feedback</h2>
              <p className="text-xs text-slate-400">Enter portal message, survey comment, review, or grievance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Grievance / Complaint Narrative <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste patient portal message, nurse note, survey commentary, or patient advocate transcription here..."
              className="w-full text-xs bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Source Channel
              </label>
              <select
                value={sourceChannel}
                onChange={(e) => setSourceChannel(e.target.value)}
                className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-teal-500"
              >
                <option value="Patient Portal Message">Patient Portal Message</option>
                <option value="Inpatient Grievance">Inpatient Grievance</option>
                <option value="Press Ganey Survey">Press Ganey Survey</option>
                <option value="Online Review / Google">Online Review / Social</option>
                <option value="Billing Dispute Form">Billing Dispute Form</option>
                <option value="Phone Call / Advocate">Phone Call / Advocate</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Originating Department / Unit
              </label>
              <input
                type="text"
                value={departmentTag}
                onChange={(e) => setDepartmentTag(e.target.value)}
                placeholder="e.g. Emergency Dept, Med-Surg 3W"
                className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Patient Ref / Identifier (Optional)
            </label>
            <input
              type="text"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              placeholder="e.g. PT-88201 or Anonymous"
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={triageImmediately}
                onChange={(e) => setTriageImmediately(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-600 focus:ring-teal-500"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Run AI Triage Immediately on Submit
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add to Triage Queue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
