import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Wifi, WifiOff, Upload, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// IndexedDB setup for offline storage
const DB_NAME = 'OfflineDriverDB';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for cached jobs
      if (!db.objectStoreNames.contains('jobs')) {
        db.createObjectStore('jobs', { keyPath: 'id' });
      }
      
      // Store for cached assignments
      if (!db.objectStoreNames.contains('assignments')) {
        db.createObjectStore('assignments', { keyPath: 'id' });
      }
      
      // Queue for pending POD uploads
      if (!db.objectStoreNames.contains('uploadQueue')) {
        const uploadStore = db.createObjectStore('uploadQueue', { keyPath: 'queueId', autoIncrement: true });
        uploadStore.createIndex('timestamp', 'timestamp');
        uploadStore.createIndex('jobId', 'jobId');
      }
      
      // Store for offline metadata
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
};

// Offline Context
const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing data...",
        duration: 3000,
      });
      syncPendingUploads();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're Offline",
        description: "You can still work. Data will sync when connection returns.",
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending uploads on mount
  useEffect(() => {
    checkPendingUploads();
  }, []);

  const checkPendingUploads = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['uploadQueue'], 'readonly');
      const store = transaction.objectStore('uploadQueue');
      const request = store.count();
      
      request.onsuccess = () => {
        setPendingUploads(request.result);
      };
    } catch (error) {
      console.error('Error checking pending uploads:', error);
    }
  };

  // Cache jobs for offline access
  const cacheJobs = async (jobs) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['jobs'], 'readwrite');
      const store = transaction.objectStore('jobs');
      
      // Clear old jobs
      await store.clear();
      
      // Add new jobs
      jobs.forEach(job => {
        store.put(job);
      });
      
      // Update metadata
      const metaTransaction = db.transaction(['metadata'], 'readwrite');
      const metaStore = metaTransaction.objectStore('metadata');
      metaStore.put({ key: 'lastSync', timestamp: new Date().toISOString() });
      
      console.log(`Cached ${jobs.length} jobs for offline access`);
    } catch (error) {
      console.error('Error caching jobs:', error);
    }
  };

  // Cache assignments for offline access
  const cacheAssignments = async (assignments) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['assignments'], 'readwrite');
      const store = transaction.objectStore('assignments');
      
      await store.clear();
      assignments.forEach(assignment => {
        store.put(assignment);
      });
      
      console.log(`Cached ${assignments.length} assignments for offline access`);
    } catch (error) {
      console.error('Error caching assignments:', error);
    }
  };

  // Get cached jobs
  const getCachedJobs = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['jobs'], 'readonly');
      const store = transaction.objectStore('jobs');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached jobs:', error);
      return [];
    }
  };

  // Get cached assignments
  const getCachedAssignments = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['assignments'], 'readonly');
      const store = transaction.objectStore('assignments');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cached assignments:', error);
      return [];
    }
  };

  // Queue POD upload for later
  const queuePODUpload = async (jobId, podData) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['uploadQueue'], 'readwrite');
      const store = transaction.objectStore('uploadQueue');
      
      const queueItem = {
        jobId,
        type: 'POD_UPLOAD',
        data: podData,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };
      
      return new Promise((resolve, reject) => {
        const request = store.add(queueItem);
        request.onsuccess = () => {
          setPendingUploads(prev => prev + 1);
          console.log('POD upload queued for job:', jobId);
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error queuing POD upload:', error);
      throw error;
    }
  };

  // Sync pending uploads
  const syncPendingUploads = async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    
    try {
      const db = await openDB();
      const transaction = db.transaction(['uploadQueue'], 'readonly');
      const store = transaction.objectStore('uploadQueue');
      
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const queueItems = request.result || [];
        
        if (queueItems.length === 0) {
          setIsSyncing(false);
          return;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (const item of queueItems) {
          try {
            if (item.type === 'POD_UPLOAD') {
              await processPODUpload(item);
              await removeFromQueue(item.queueId);
              successCount++;
            }
          } catch (error) {
            console.error('Error syncing item:', error);
            failCount++;
            
            // Update retry count
            await updateQueueItemRetryCount(item.queueId, item.retryCount + 1);
          }
        }
        
        setPendingUploads(failCount);
        
        if (successCount > 0) {
          toast({
            title: "Sync Complete",
            description: `${successCount} upload(s) synced successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
            duration: 5000,
          });
        }
        
        setIsSyncing(false);
      };
    } catch (error) {
      console.error('Error syncing pending uploads:', error);
      setIsSyncing(false);
    }
  };

  // Process POD upload from queue
  const processPODUpload = async (queueItem) => {
    const { jobId, data } = queueItem;
    const { photos, notes, compressedPhotos } = data;
    
    // Upload photos
    const uploadPromises = compressedPhotos.map(photoData => {
      const blob = dataURLtoBlob(photoData);
      const file = new File([blob], 'pod-photo.jpg', { type: 'image/jpeg' });
      return base44.integrations.Core.UploadFile({ file });
    });
    
    const results = await Promise.all(uploadPromises);
    const podFileUrls = results.map(r => r.file_url);
    
    // Get current job
    const jobs = await base44.entities.Job.list();
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Get existing POD files and append new ones
    const existingPodFiles = job.podFiles || [];
    const allPodFiles = [...existingPodFiles, ...podFileUrls];
    
    // Update job
    await base44.entities.Job.update(jobId, {
      ...job,
      podFiles: allPodFiles,
      podNotes: notes || job.podNotes,
      status: 'DELIVERED',
      driverStatus: 'COMPLETED'
    });
    
    // Send notifications if needed
    if (notes && notes.trim()) {
      try {
        const user = await base44.auth.me();
        await base44.functions.invoke('sendPODNotesNotification', {
          jobId,
          customerName: job.customerName,
          deliveryLocation: job.deliveryLocation,
          notes: notes.trim(),
          driverName: user?.full_name || 'Driver'
        });
      } catch (error) {
        console.error('Failed to send POD notification:', error);
      }
    }
  };

  // Helper to convert data URL to Blob
  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Remove item from queue
  const removeFromQueue = async (queueId) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['uploadQueue'], 'readwrite');
      const store = transaction.objectStore('uploadQueue');
      await store.delete(queueId);
    } catch (error) {
      console.error('Error removing from queue:', error);
    }
  };

  // Update retry count
  const updateQueueItemRetryCount = async (queueId, retryCount) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['uploadQueue'], 'readwrite');
      const store = transaction.objectStore('uploadQueue');
      
      const getRequest = store.get(queueId);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount = retryCount;
          store.put(item);
        }
      };
    } catch (error) {
      console.error('Error updating retry count:', error);
    }
  };

  const value = {
    isOnline,
    pendingUploads,
    isSyncing,
    cacheJobs,
    cacheAssignments,
    getCachedJobs,
    getCachedAssignments,
    queuePODUpload,
    syncPendingUploads
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
      <OfflineIndicator 
        isOnline={isOnline} 
        pendingUploads={pendingUploads}
        isSyncing={isSyncing}
      />
    </OfflineContext.Provider>
  );
};

// Offline indicator component
const OfflineIndicator = ({ isOnline, pendingUploads, isSyncing }) => {
  if (isOnline && pendingUploads === 0 && !isSyncing) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom">
      <Badge 
        className={`${
          !isOnline 
            ? 'bg-orange-500 hover:bg-orange-600' 
            : isSyncing 
            ? 'bg-blue-500 hover:bg-blue-600 animate-pulse'
            : 'bg-green-500 hover:bg-green-600'
        } text-white px-4 py-2 text-sm shadow-lg flex items-center gap-2`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode</span>
          </>
        ) : isSyncing ? (
          <>
            <Upload className="h-4 w-4 animate-bounce" />
            <span>Syncing {pendingUploads} item(s)...</span>
          </>
        ) : pendingUploads > 0 ? (
          <>
            <Upload className="h-4 w-4" />
            <span>{pendingUploads} pending upload(s)</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>All synced</span>
          </>
        )}
      </Badge>
    </div>
  );
};

export default OfflineProvider;