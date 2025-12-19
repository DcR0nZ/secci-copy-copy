import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const GEOFENCE_RADIUS = 100; // meters
const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

export default function GeofenceTracker({ jobs, user, onStatusChange }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [checkedJobs, setCheckedJobs] = useState(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    setWatchId(id);

    // Periodic location updates to backend
    const interval = setInterval(() => {
      if (currentLocation) {
        updateLocationOnBackend(currentLocation);
      }
    }, LOCATION_UPDATE_INTERVAL);

    return () => {
      if (id) {
        navigator.geolocation.clearWatch(id);
      }
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (currentLocation && jobs.length > 0) {
      checkGeofences();
    }
  }, [currentLocation, jobs]);

  const handleLocationUpdate = (position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: new Date(position.timestamp).toISOString()
    };
    
    setCurrentLocation(location);
  };

  const handleLocationError = (error) => {
    console.error('Geolocation error:', error);
  };

  const updateLocationOnBackend = async (location) => {
    try {
      await base44.functions.invoke('updateDriverLocation', {
        userId: user.id,
        userName: user.full_name,
        truckId: user.truck,
        ...location
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const checkGeofences = () => {
    jobs.forEach(job => {
      if (!job.deliveryLatitude || !job.deliveryLongitude) return;
      
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        job.deliveryLatitude,
        job.deliveryLongitude
      );

      const isInGeofence = distance <= GEOFENCE_RADIUS;
      const wasChecked = checkedJobs.has(job.id);
      const currentStatus = job.driverStatus || 'NOT_STARTED';

      // Arrived at location
      if (isInGeofence && !wasChecked && currentStatus === 'EN_ROUTE') {
        handleGeofenceEnter(job);
        setCheckedJobs(prev => new Set(prev).add(job.id));
      }
      
      // Left location
      if (!isInGeofence && wasChecked && currentStatus === 'ARRIVED') {
        handleGeofenceExit(job);
        setCheckedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
      }
    });
  };

  const handleGeofenceEnter = async (job) => {
    toast({
      title: "Arrived at Location",
      description: `You've arrived at ${job.customerName}`,
    });

    if (onStatusChange) {
      onStatusChange(job, 'ARRIVED');
    }

    // Auto-update status
    try {
      await base44.functions.invoke('mobileUpdateJobStatus', {
        jobId: job.id,
        status: 'ARRIVED',
        driverStatus: 'ARRIVED',
        userId: user.id,
        userName: user.full_name
      });
    } catch (error) {
      console.error('Failed to update arrival status:', error);
    }
  };

  const handleGeofenceExit = async (job) => {
    // Only notify, don't auto-change status on exit
    toast({
      title: "Left Location",
      description: `You've left ${job.customerName}`,
      duration: 2000,
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // This component only handles tracking, no UI
  return null;
}

// Export for use in other components
export { GeofenceTracker };