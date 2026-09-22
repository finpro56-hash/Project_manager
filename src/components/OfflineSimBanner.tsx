import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { syncEngine } from '../lib/syncEngine';

export const OfflineSimBanner: React.FC = () => {
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(syncEngine.getSimulateOffline());
  const [pendingCount, setPendingCount] = useState(syncEngine.getPendingMutationsCount());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = syncEngine.subscribe(() => {
      setIsSimulatedOffline(syncEngine.getSimulateOffline());
      setPendingCount(syncEngine.getPendingMutationsCount());
    });
    return unsub;
  }, []);

  const toggleSimulate = () => {
    const nextVal = !isSimulatedOffline;
    syncEngine.setSimulateOffline(nextVal);
    setIsSimulatedOffline(nextVal);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncEngine.flushOfflineQueue();
    setIsSyncing(false);
  };

  return (
    <div
      id="offline-control-bar"
      className="w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3"
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            isSimulatedOffline
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          }`}
        >
          {isSimulatedOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {isSimulatedOffline ? 'Simulated Offline Mode' : 'Connected & Syncing'}
        </span>

        <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
          {isSimulatedOffline
            ? 'Network calls suspended. All task edits, tags, and status updates are stored locally in IndexedDB.'
            : 'Real-time WebSocket & REST synchronization active across all devices.'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
            {pendingCount} queued {pendingCount === 1 ? 'change' : 'changes'}
          </span>
        )}

        <button
          id="btn-toggle-offline-sim"
          onClick={toggleSimulate}
          className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 border text-xs cursor-pointer ${
            isSimulatedOffline
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-xs'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
          }`}
        >
          {isSimulatedOffline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
          <span>{isSimulatedOffline ? 'Go Online & Sync' : 'Simulate Offline Mode'}</span>
        </button>

        {!isSimulatedOffline && (
          <button
            id="btn-force-sync"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            title="Force synchronization"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};
