import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudUpload } from 'lucide-react';
import { syncEngine } from '../lib/syncEngine';
import { SyncStatus } from '../types';

export const OfflineIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine.getSyncStatus());
  const [pendingCount, setPendingCount] = useState<number>(syncEngine.getPendingMutationsCount());
  const [isEffectiveOffline, setIsEffectiveOffline] = useState<boolean>(syncEngine.isEffectiveOffline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(() => {
      setSyncStatus(syncEngine.getSyncStatus());
      setPendingCount(syncEngine.getPendingMutationsCount());
      setIsEffectiveOffline(syncEngine.isEffectiveOffline());
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncEngine.flushOfflineQueue();
    setIsSyncing(false);
  };

  if (!isEffectiveOffline && pendingCount === 0 && syncStatus === 'synced') {
    return null;
  }

  return (
    <div
      id="banner-offline-status"
      className={`fixed bottom-4 left-4 z-40 flex items-center gap-3 rounded-xl px-3.5 py-2.5 shadow-xl border text-xs transition-all ${
        isEffectiveOffline
          ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          : pendingCount > 0
          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
          : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
      }`}
    >
      {isEffectiveOffline ? (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold">Offline Mode Active</span>
          <span className="text-amber-700/80 dark:text-amber-300/80">
            {pendingCount > 0 ? `(${pendingCount} changes queued locally)` : '(All edits cached in device)'}
          </span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center gap-2">
          <CloudUpload className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span className="font-semibold">{pendingCount} offline changes pending sync</span>
          <button
            id="btn-manual-sync-banner"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="ml-2 flex items-center gap-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-[11px] font-medium shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">All changes synced to cloud</span>
        </div>
      )}
    </div>
  );
};
