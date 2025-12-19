import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { Wifi, WifiOff } from 'lucide-react';

const STORAGE_KEYS = {
  JOBS: 'offline_driver_jobs',
  POD_QUEUE: 'offline_pod_queue',
  STATUS_QUEUE: 'offline_status_queue',
  LAST_SYNC: 'offline_last_sync'
};

export default function OfflineSyncManager({ userId, truck, onJobsUpdate }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Working offline. Changes will sync when connected.",
        duration: 3000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending items on mount
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = () => {
    const podQueue = JSON.parse(localStorage.getItem(STORAGE_KEYS.POD_QUEUE) || '[]');
    const statusQueue = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATUS_QUEUE) || '[]');
    setPendingCount(podQueue.length + statusQueue.length);
  };

  const syncPendingData = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      // Sync status updates
      const statusQueue = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATUS_QUEUE) || '[]');
      for (const update of statusQueue) {
        try {
          await base44.functions.invoke('mobileUpdateJobStatus', update);
        } catch (error) {
          console.error('Failed to sync status update:', error);
        }
      }

      // Sync POD submissions
      const podQueue = JSON.parse(localStorage.getItem(STORAGE_KEYS.POD_QUEUE) || '[]');
      for (const pod of podQueue) {
        try {
          await base44.functions.invoke('mobileSubmitPOD', pod);
        } catch (error) {
          console.error('Failed to sync POD:', error);
        }
      }

      // Clear queues after successful sync
      if (statusQueue.length > 0 || podQueue.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STATUS_QUEUE, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.POD_QUEUE, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        
        toast({
          title: "Synced",
          description: `${statusQueue.length + podQueue.length} updates synced successfully.`,
        });

        // Refresh jobs
        if (onJobsUpdate) {
          onJobsUpdate();
        }
      }

      updatePendingCount();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Cache jobs for offline access
  const cacheJobs = (jobs) => {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
  };

  // Get cached jobs
  const getCachedJobs = () => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.JOBS) || '[]');
  };

  // Queue status update for later sync
  const queueStatusUpdate = (update) => {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATUS_QUEUE) || '[]');
    queue.push({
      ...update,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.STATUS_QUEUE, JSON.stringify(queue));
    updatePendingCount();
  };

  // Queue POD submission for later sync
  const queuePODSubmission = (pod) => {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.POD_QUEUE) || '[]');
    queue.push({
      ...pod,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.POD_QUEUE, JSON.stringify(queue));
    updatePendingCount();
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg ${
        isOnline ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
      }`}>
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span className="text-sm font-medium">
          {syncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
        </span>
        {pendingCount > 0 && (
          <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-semibold">
            {pendingCount}
          </span>
        )}
      </div>
    </div>
  );
}

// Export utility functions
export const OfflineUtils = {
  cacheJobs: (jobs) => {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
  },
  
  getCachedJobs: () => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.JOBS) || '[]');
  },
  
  queueStatusUpdate: (update) => {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATUS_QUEUE) || '[]');
    queue.push({
      ...update,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.STATUS_QUEUE, JSON.stringify(queue));
  },
  
  queuePODSubmission: (pod) => {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.POD_QUEUE) || '[]');
    queue.push({
      ...pod,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.POD_QUEUE, JSON.stringify(queue));
  }
};