
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Truck, MapPin, Navigation, Clock, Activity, AlertCircle, CheckCircle2, Package, Radio } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icons based on status
const createTruckIcon = (status, truckId) => {
  const colors = {
    'en route': '#3B82F6',
    'arrived': '#10B981',
    'unloading': '#8B5CF6',
    'problem': '#DC2626',
    'completed': '#059669',
    'active': '#3B82F6',
    'idle': '#F59E0B',
    'offline': '#6B7280'
  };
  
  const color = colors[status?.toLowerCase()] || colors.active;
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      ">
        🚚
      </div>
    `,
    className: 'custom-truck-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Component to update map bounds
function MapBounds({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);
  
  return null;
}

export default function LiveTracking() {
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Check access
      if (user.role !== 'admin' && user.appRole !== 'dispatcher' && user.appRole !== 'manager') {
        return;
      }

      const today = format(new Date(), 'yyyy-MM-dd');

      const [allLocations, allJobs, todayAssignments] = await Promise.all([
        base44.entities.LocationUpdate.list('-timestamp', 100),
        base44.entities.Job.list(),
        base44.entities.Assignment.filter({ date: today })
      ]);

      // Get the most recent location for each truck/machine
      const latestLocations = {};
      allLocations.forEach(loc => {
        const key = loc.truckId || loc.machineId;
        if (key && (!latestLocations[key] || new Date(loc.timestamp) > new Date(latestLocations[key].timestamp))) {
          latestLocations[key] = loc;
        }
      });

      // Filter out old locations (more than 5 minutes old)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentLocations = Object.values(latestLocations).filter(loc => 
        new Date(loc.timestamp) > fiveMinutesAgo
      );

      setLocationUpdates(recentLocations);
      setJobs(allJobs);
      setAssignments(todayAssignments);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch once on mount - no automatic polling
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.appRole !== 'dispatcher' && currentUser.appRole !== 'manager')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">You don't have access to live tracking. This feature is for dispatch and management only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current jobs for each truck
  const getTruckJobs = (truckId) => {
    const truckAssignments = assignments.filter(a => a.truckId === truckId);
    return truckAssignments.map(a => jobs.find(j => j.id === a.jobId)).filter(Boolean);
  };

  const defaultCenter = [-27.4698, 153.0251]; // Brisbane

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Fleet Tracking</h1>
          <p className="text-gray-600 mt-1">Real-time GPS location of all active drivers</p>
        </div>
        {/* The badge now indicates manual refresh or initial load only */}
        <Badge className="bg-green-600">
          <Activity className="h-3 w-3 mr-1" />
          Last update: {format(new Date(), 'h:mm:ss a')}
        </Badge>
      </div>

      {/* Fleet Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Trucks</p>
                <p className="text-2xl font-bold text-gray-900">{locationUpdates.filter(l => l.truckId).length}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Route</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter(j => j.driverStatus === 'EN_ROUTE').length}
                </p>
              </div>
              <Navigation className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Problems</p>
                <p className="text-2xl font-bold text-red-600">
                  {jobs.filter(j => j.driverStatus === 'PROBLEM').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div style={{ height: '500px', width: '100%' }}>
            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBounds locations={locationUpdates} />
              
              {locationUpdates.map((location, index) => {
                const vehicleId = location.truckId || location.machineName || 'Unknown';
                const truckJobs = location.truckId ? getTruckJobs(location.truckId) : [];
                const currentJob = truckJobs.find(j => j.driverStatus && j.driverStatus !== 'NOT_STARTED' && j.driverStatus !== 'COMPLETED');
                
                return (
                  <Marker
                    key={`${vehicleId}-${index}`}
                    position={[location.latitude, location.longitude]}
                    icon={createTruckIcon(currentJob?.driverStatus || location.status, vehicleId)}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-5 w-5 text-blue-600" />
                          <h3 className="font-bold text-lg">{vehicleId}</h3>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Radio className="h-3 w-3 text-gray-500" />
                            <span><strong>Driver:</strong> {location.userName}</span>
                          </div>
                          
                          {currentJob && (
                            <>
                              <div className="border-t pt-2">
                                <Badge className={
                                  currentJob.driverStatus === 'EN_ROUTE' ? 'bg-blue-600' :
                                  currentJob.driverStatus === 'ARRIVED' ? 'bg-green-600' :
                                  currentJob.driverStatus === 'UNLOADING' ? 'bg-purple-600' :
                                  currentJob.driverStatus === 'PROBLEM' ? 'bg-red-600' :
                                  'bg-gray-600'
                                }>
                                  {currentJob.driverStatus}
                                </Badge>
                                <p className="mt-1"><strong>{currentJob.customerName}</strong></p>
                                <p className="text-xs text-gray-600">{currentJob.deliveryLocation}</p>
                              </div>
                              
                              {currentJob.problemDetails && (
                                <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                                  <strong>Problem:</strong> {currentJob.problemDetails}
                                </div>
                              )}
                            </>
                          )}
                          
                          {truckJobs.length > 0 && (
                            <div className="border-t pt-2">
                              <p className="text-xs text-gray-600">
                                <strong>Today:</strong> {truckJobs.length} job{truckJobs.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-2">
                            <Clock className="h-3 w-3" />
                            {format(new Date(location.timestamp), 'h:mm:ss a')}
                          </div>
                          
                          {location.speed !== null && location.speed !== undefined && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Activity className="h-3 w-3" />
                              {(location.speed * 3.6).toFixed(0)} km/h
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Driver Status List */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {locationUpdates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active drivers at the moment</p>
          ) : (
            <div className="space-y-3">
              {locationUpdates.map((location, index) => {
                const vehicleId = location.truckId || location.machineName || 'Unknown';
                const truckJobs = location.truckId ? getTruckJobs(location.truckId) : [];
                const currentJob = truckJobs.find(j => j.driverStatus && j.driverStatus !== 'NOT_STARTED' && j.driverStatus !== 'COMPLETED');
                
                return (
                  <div key={`${vehicleId}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                        {vehicleId.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{vehicleId}</p>
                        <p className="text-sm text-gray-600">{location.userName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {currentJob && (
                        <div className="text-right">
                          <Badge className={
                            currentJob.driverStatus === 'EN_ROUTE' ? 'bg-blue-600' :
                            currentJob.driverStatus === 'ARRIVED' ? 'bg-green-600' :
                            currentJob.driverStatus === 'UNLOADING' ? 'bg-purple-600' :
                            currentJob.driverStatus === 'PROBLEM' ? 'bg-red-600' :
                            'bg-gray-600'
                          }>
                            {currentJob.driverStatus}
                          </Badge>
                          <p className="text-xs text-gray-600 mt-1">{currentJob.customerName}</p>
                        </div>
                      )}
                      
                      <div className="text-right text-sm">
                        <p className="text-gray-600">
                          {format(new Date(location.timestamp), 'h:mm a')}
                        </p>
                        {location.speed !== null && location.speed !== undefined && (
                          <p className="text-xs text-gray-500">
                            {(location.speed * 3.6).toFixed(0)} km/h
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
