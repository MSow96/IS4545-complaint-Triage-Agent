import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { ComplaintTable } from './components/ComplaintTable';
import { FileUploadModal } from './components/FileUploadModal';
import { NewComplaintModal } from './components/NewComplaintModal';
import { ComplaintDossierModal } from './components/ComplaintDossierModal';
import { SAMPLE_COMPLAINTS } from './data/sampleComplaints';
import type { ComplaintRecord, RecommendedDepartment, SeverityLevel, TriageResult } from './types/triage';
import { AlertCircle, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'aegiscare_complaints_v1';

export default function App() {
  const [records, setRecords] = useState<ComplaintRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to restore from local storage', e);
    }
    return SAMPLE_COMPLAINTS;
  });

  const [selectedRecord, setSelectedRecord] = useState<ComplaintRecord | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isBatchTriaging, setIsBatchTriaging] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.warn('Storage sync failed', err);
    }
  }, [records]);

  // Keep selected record synced with updated state
  useEffect(() => {
    if (selectedRecord) {
      const updated = records.find((r) => r.id === selectedRecord.id);
      if (updated && updated !== selectedRecord) {
        setSelectedRecord(updated);
      }
    }
  }, [records, selectedRecord]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleTriageSingle = async (recordId: string) => {
    const target = records.find((r) => r.id === recordId);
    if (!target) return;

    // Set triaging state
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: 'triaging' as const } : r))
    );

    try {
      const res = await fetch('/api/triage/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: target.rawText }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      const triageResult: TriageResult = data.triage;

      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                status: 'triaged' as const,
                triage: triageResult,
              }
            : r
        )
      );

      showNotification(`Triaged ${recordId}: ${triageResult.complaintCategory} (Level ${triageResult.severityLevel})`);
    } catch (err) {
      console.error('Triage failed:', err);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                status: 'error' as const,
                errorMessage: 'AI triage request encountered an error.',
              }
            : r
        )
      );
      showNotification(`Failed to triage ${recordId}. Check connection.`, 'error');
    }
  };

  const handleTriageBatch = async () => {
    const pendingItems = records.filter((r) => r.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsBatchTriaging(true);
    setBatchProgress({ current: 0, total: pendingItems.length });

    // Mark as triaging
    setRecords((prev) =>
      prev.map((r) => (r.status === 'pending' ? { ...r, status: 'triaging' as const } : r))
    );

    try {
      const payload = pendingItems.map((p) => ({
        id: p.id,
        rawText: p.rawText,
      }));

      const res = await fetch('/api/triage/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const { results } = await res.json();
      const resultMap = new Map<string, TriageResult>();
      results.forEach((item: { id: string; triage?: TriageResult }) => {
        if (item.triage) {
          resultMap.set(item.id, item.triage);
        }
      });

      setRecords((prev) =>
        prev.map((r) => {
          const triaged = resultMap.get(r.id);
          if (triaged) {
            return {
              ...r,
              status: 'triaged' as const,
              triage: triaged,
            };
          }
          if (r.status === 'triaging') {
            return { ...r, status: 'error' as const };
          }
          return r;
        })
      );

      setBatchProgress({ current: pendingItems.length, total: pendingItems.length });
      showNotification(`Successfully triaged ${resultMap.size} healthcare complaints!`);
    } catch (err) {
      console.error('Batch triage failed:', err);
      showNotification('Batch triage encountered an error.', 'error');
      // Reset triaging status to pending
      setRecords((prev) =>
        prev.map((r) => (r.status === 'triaging' ? { ...r, status: 'pending' as const } : r))
      );
    } finally {
      setIsBatchTriaging(false);
    }
  };

  const handleImportRecords = (newRecords: ComplaintRecord[]) => {
    setRecords((prev) => [...newRecords, ...prev]);
    showNotification(`Imported ${newRecords.length} complaints from data source.`);
  };

  const handleAddNewComplaint = async (newRecord: ComplaintRecord, triageImmediately: boolean) => {
    setRecords((prev) => [newRecord, ...prev]);
    showNotification(`Added new complaint ${newRecord.id} to queue.`);

    if (triageImmediately) {
      await handleTriageSingle(newRecord.id);
    }
  };

  const handleLoadSamples = () => {
    setRecords(SAMPLE_COMPLAINTS);
    showNotification('Loaded 7 clinical benchmark cases across all severity levels.');
  };

  const handleUpdateSignOff = (
    recordId: string,
    signOffData: {
      signedOff: boolean;
      reviewerName?: string;
      reviewerRole?: string;
      clinicalNotes?: string;
      overrideDepartment?: RecommendedDepartment;
      overrideSeverity?: SeverityLevel;
    }
  ) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        const updatedSignOff = {
          ...signOffData,
          signedAt: new Date().toISOString(),
        };
        return {
          ...r,
          humanSignOff: updatedSignOff,
        };
      })
    );
    showNotification(`Recorded clinical sign-off for ${recordId}.`);
  };

  const handleDeleteRecord = (recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(null);
    }
    showNotification(`Removed complaint ${recordId}.`);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear the entire complaint queue?')) {
      setRecords([]);
      setSelectedRecord(null);
      showNotification('Cleared all complaints.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Clinical App Header */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenNew={() => setIsNewOpen(true)}
        onLoadSamples={handleLoadSamples}
        totalCount={records.length}
        triagedCount={records.filter((r) => r.status === 'triaged').length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            className={`mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-medium transition ${
              notification.type === 'success'
                ? 'bg-teal-950/40 border-teal-500/30 text-teal-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Clinical Protocol Mission Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Healthcare Organization Triage Protocol</span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Standardized 6-step evaluation for patient complaints, portal messages, survey comments, and grievances.
              Determines <strong className="text-white">What Happened</strong>, <strong className="text-white">Severity Level (1-4)</strong>, <strong className="text-white">Risk Flags</strong>, <strong className="text-white">Department Routing</strong>, and <strong className="text-white">Human Review Oversight</strong>.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 text-xs text-slate-400 bg-slate-850/80 px-3 py-2 rounded-xl border border-slate-700/60">
            <HeartHandshake className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Strict Triage Only • Non-Resolving Agent</span>
          </div>
        </div>

        {/* Real-time Triage Metrics HUD */}
        <MetricsBar records={records} />

        {/* Complaints Table Workbench */}
        <ComplaintTable
          records={records}
          onSelectRecord={(rec) => setSelectedRecord(rec)}
          onTriageSingle={handleTriageSingle}
          onTriageBatch={handleTriageBatch}
          onDeleteRecord={handleDeleteRecord}
          onClearAll={handleClearAll}
          isBatchTriaging={isBatchTriaging}
          batchProgress={batchProgress}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>AegisCare Complaint Triage Assistant • Designed for Patient Advocacy, Clinical Risk, and Healthcare Operations</p>
      </footer>

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImport={handleImportRecords}
      />

      <NewComplaintModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSubmit={handleAddNewComplaint}
      />

      <ComplaintDossierModal
        record={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        onUpdateSignOff={handleUpdateSignOff}
        onReTriage={handleTriageSingle}
      />
    </div>
  );
}
