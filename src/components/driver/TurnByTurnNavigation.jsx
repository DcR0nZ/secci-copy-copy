import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { Navigation, X, ArrowUp, ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function TurnByTurnNavigation({ job, currentLocation, onClose }) {
  const [route, setRoute] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [instructions, setInstructions] = useState([]);
  const [distanceRemaining, setDistanceRemaining] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);

  useEffect(() => {
    if (currentLocation && job.deliveryLatitude && job.deliveryLongitude) {
      fetchRoute();
    }
  }, [currentLocation, job]);

  useEffect(() => {
    if (currentLocation && route) {
      updateProgress();
    }
  }, [currentLocation, route]);

  const fetchRoute = async () => {
    try {
      // Using OpenRouteService or similar routing API
      const start = `${currentLocation.longitude},${currentLocation.latitude}`;
      const end = `${job.deliveryLongitude},${job.deliveryLatitude}`;
      
      // For demo purposes, we'll create a simple direct route
      // In production, integrate with OpenRouteService, Mapbox, or Google Maps Directions API
      const routeCoordinates = [
        [currentLocation.latitude, currentLocation.longitude],
        [job.deliveryLatitude, job.deliveryLongitude]
      ];
      
      setRoute(routeCoordinates);
      
      // Calculate simple instructions
      const steps = [
        { instruction: 'Head towards destination', distance: calculateDistance(currentLocation, job) },
        { instruction: 'Arrive at destination', distance: 0 }
      ];
      
      setInstructions(steps);
      setDistanceRemaining(steps[0].distance);
      setEtaMinutes(Math.ceil(steps[0].distance / 0.5)); // Assuming 30km/h average
    } catch (error) {
      console.error('Failed to fetch route:', error);
    }
  };

  const calculateDistance = (from, to) => {
    const R = 6371; // Earth's radius in km
    const dLat = (to.deliveryLatitude - from.latitude) * Math.PI / 180;
    const dLon = (to.deliveryLongitude - from.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.deliveryLatitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const updateProgress = () => {
    if (!route || instructions.length === 0) return;
    
    const remaining = calculateDistance(currentLocation, job);
    setDistanceRemaining(remaining);
    setEtaMinutes(Math.ceil(remaining / 0.5));
  };

  const getDirectionIcon = (instruction) => {
    if (instruction.includes('left')) return <ArrowLeft className="h-8 w-8" />;
    if (instruction.includes('right')) return <ArrowRight className="h-8 w-8" />;
    return <ArrowUp className="h-8 w-8" />;
  };

  if (!currentLocation || !job.deliveryLatitude || !job.deliveryLongitude) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Calculating route...</p>
      </div>
    );
  }

  const center = currentLocation 
    ? [currentLocation.latitude, currentLocation.longitude]
    : [job.deliveryLatitude, job.deliveryLongitude];

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Map */}
      <div className="h-[60vh] w-full">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController center={center} zoom={13} />
          
          {/* Current location marker */}
          {currentLocation && (
            <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
              <Popup>Your location</Popup>
            </Marker>
          )}
          
          {/* Destination marker */}
          <Marker position={[job.deliveryLatitude, job.deliveryLongitude]}>
            <Popup>{job.deliveryLocation}</Popup>
          </Marker>
          
          {/* Route line */}
          {route && (
            <Polyline positions={route} color="blue" weight={4} />
          )}
        </MapContainer>
      </div>

      {/* Close button */}
      <Button
        className="absolute top-4 right-4 z-[1000] bg-white text-gray-900 hover:bg-gray-100"
        size="icon"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Navigation instructions */}
      <div className="p-4 space-y-3">
        {/* Current instruction */}
        {instructions[currentStep] && (
          <Card className="bg-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  {getDirectionIcon(instructions[currentStep].instruction)}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">
                    {instructions[currentStep].instruction}
                  </p>
                  {instructions[currentStep].distance > 0 && (
                    <p className="text-sm text-blue-100">
                      in {instructions[currentStep].distance.toFixed(1)} km
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip info */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Distance</p>
              <p className="text-2xl font-bold text-gray-900">
                {distanceRemaining ? distanceRemaining.toFixed(1) : '—'}
                <span className="text-sm font-normal text-gray-600"> km</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">ETA</p>
              <p className="text-2xl font-bold text-gray-900">
                {etaMinutes || '—'}
                <span className="text-sm font-normal text-gray-600"> min</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Destination info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{job.customerName}</p>
                <p className="text-sm text-gray-600">{job.deliveryLocation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}