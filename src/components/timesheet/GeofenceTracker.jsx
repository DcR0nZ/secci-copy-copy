import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function GeofenceTracker({ user, settings }) {
  const { toast } = useToast();
  const lastStatusRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!settings?.geofenceEnabled) return;
    if (!user?.isTimesheetEnabled) return;

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

      return R * c;
    };

    const checkGeofence = async (position) => {
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        settings.geofenceCenterLat,
        settings.geofenceCenterLng
      );

      const isInside = distance <= settings.geofenceRadiusMeters;
      
      // Debounce: wait 60 seconds before changing status
      if (lastStatusRef.current !== null && lastStatusRef.current !== isInside) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
          await handleStatusChange(isInside);
        }, 60000); // 60 second debounce
      } else if (lastStatusRef.current === null) {
        // First check
        lastStatusRef.current = isInside;
        if (isInside && user.userWorkStatus === 'OFF_SHIFT') {
          await handleStatusChange(true);
        }
      }
    };

    const handleStatusChange = async (entering) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (entering && user.userWorkStatus === 'OFF_SHIFT') {
        // Entering geofence
        if (settings.requireManualConfirmOnEntry) {
          const confirmed = window.confirm('You have entered the work location. Start your shift?');
          if (!confirmed) {
            lastStatusRef.current = false;
            return;
          }
        }

        try {
          await base44.auth.updateMe({
            userWorkStatus: 'ON_SHIFT',
            lastWorkStatusChangedAt: new Date().toISOString()
          });

          await base44.entities.ShiftSession.create({
            tenantId: user.tenantId || 'sec',
            userId: user.id,
            userName: user.full_name,
            dateKey: today,
            startAt: new Date().toISOString(),
            source: 'GEOFENCE'
          });

          toast({
            title: "Shift Started",
            description: "You've entered the work location",
          });

          lastStatusRef.current = true;
        } catch (error) {
          console.error('Error starting shift:', error);
        }
      } else if (!entering && user.userWorkStatus === 'ON_SHIFT') {
        // Exiting geofence
        try {
          const sessions = await base44.entities.ShiftSession.filter({
            userId: user.id,
            dateKey: today
          });

          const openSession = sessions.find(s => !s.endAt);
          
          if (openSession) {
            const now = new Date();
            const start = new Date(openSession.startAt);
            const minutesWorked = Math.floor((now - start) / 60000);

            await base44.entities.ShiftSession.update(openSession.id, {
              endAt: now.toISOString(),
              minutesWorked
            });
          }

          await base44.auth.updateMe({
            userWorkStatus: 'OFF_SHIFT',
            lastWorkStatusChangedAt: new Date().toISOString()
          });

          toast({
            title: "Shift Ended",
            description: "You've left the work location",
          });

          lastStatusRef.current = false;
        } catch (error) {
          console.error('Error ending shift:', error);
        }
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      checkGeofence,
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Also poll at interval
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        checkGeofence,
        (error) => console.error('Polling error:', error),
        { enableHighAccuracy: true }
      );
    }, (settings.locationPollingSeconds || 120) * 1000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user, settings, toast]);

  return null; // This is a background tracker component
}