import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Activity, AlertCircle, Navigation as NavigationIcon, Zap } from 'lucide-react';

export default function LocationTracker({ trackingType = 'driver', updateInterval = 10000 }) {
  const [tracking, setTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: new Date().toISOString()
          };

          // Get battery level if available (for machines)
          if (trackingType === 'machine' && 'getBattery' in navigator) {
            try {
              const battery = await navigator.getBattery();
              locationData.batteryLevel = Math.round(battery.level * 100);
            } catch (e) {
              // Battery API not available, continue without it
            }
          }

          // Send location to appropriate backend function
          const functionName = trackingType === 'machine' ? 'updateMachineLocation' : 'updateDriverLocation';
          await base44.functions.invoke(functionName, locationData);

          setLastUpdate(locationData);
          setUpdateCount(prev => prev + 1);
          setTracking(true);
          setError(null);
        } catch (err) {
          console.error('Failed to update location:', err);
          setError('Failed to send location update');
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(`Location error: ${err.message}`);
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setTracking(false);
    }
  };

  const trackingLabel = trackingType === 'machine' ? 'Machine Tracking' : 'Driver Tracking';

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {tracking ? (
              <>
                <div className="relative">
                  <Activity className="h-5 w-5 text-green-600 animate-pulse" />
                  <div className="absolute -top-1 -right-1">
                    <Zap className="h-3 w-3 text-yellow-500 animate-bounce" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-green-700">Live {trackingLabel} Active</p>
                  <p className="text-xs text-gray-600">GPS location is being shared in real-time</p>
                </div>
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-semibold text-sm text-gray-700">{trackingLabel} Inactive</p>
                  <p className="text-xs text-gray-600">Location sharing disabled</p>
                </div>
              </>
            )}
          </div>
          <Badge className={tracking ? 'bg-green-600 animate-pulse' : 'bg-gray-500'}>
            {tracking ? 'LIVE' : 'OFFLINE'}
          </Badge>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {lastUpdate && tracking && (
          <div className="mt-3 pt-3 border-t border-blue-200 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <NavigationIcon className="h-3 w-3" />
                <span>Last update: {new Date(lastUpdate.timestamp).toLocaleTimeString()}</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white">
                {updateCount} updates sent
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center gap-1 text-gray-600 bg-white rounded px-2 py-1">
                <MapPin className="h-3 w-3" />
                <span className="font-medium">±{lastUpdate.accuracy?.toFixed(0)}m</span>
              </div>
              {lastUpdate.speed !== null && lastUpdate.speed !== undefined && (
                <div className="flex items-center gap-1 text-gray-600 bg-white rounded px-2 py-1">
                  <Activity className="h-3 w-3" />
                  <span className="font-medium">{(lastUpdate.speed * 3.6).toFixed(0)} km/h</span>
                </div>
              )}
              {trackingType === 'machine' && lastUpdate.batteryLevel !== undefined && (
                <div className="flex items-center gap-1 text-gray-600 bg-white rounded px-2 py-1">
                  <span className="font-medium">🔋 {lastUpdate.batteryLevel}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tracking && (
          <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded-lg text-xs text-blue-800 text-center">
            ✓ Dispatch can see your location on the Live Tracking map
          </div>
        )}
      </CardContent>
    </Card>
  );
}