import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export default function FleetMapView({ trucks, locations }) {
  const trucksWithLocations = trucks.filter(truck => 
    locations.some(loc => loc.truckId === truck.id)
  ).map(truck => ({
    ...truck,
    location: locations.find(loc => loc.truckId === truck.id)
  }));

  // Calculate center of all trucks or default to a location
  const center = trucksWithLocations.length > 0
    ? [
        trucksWithLocations.reduce((sum, t) => sum + t.location.latitude, 0) / trucksWithLocations.length,
        trucksWithLocations.reduce((sum, t) => sum + t.location.longitude, 0) / trucksWithLocations.length
      ]
    : [-27.4698, 153.0251]; // Brisbane

  if (trucksWithLocations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-600">No trucks with active GPS tracking</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="h-[600px] w-full">
          <MapContainer
            center={center}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {trucksWithLocations.map((truck) => (
              <Marker
                key={truck.id}
                position={[truck.location.latitude, truck.location.longitude]}
                icon={truckIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-lg mb-1">{truck.name}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Driver: {truck.location.userName || 'Unknown'}</p>
                      <p className="text-gray-600">
                        Last update: {new Date(truck.location.timestamp).toLocaleTimeString()}
                      </p>
                      {truck.location.speed !== null && (
                        <p className="text-gray-600">
                          Speed: {(truck.location.speed * 3.6).toFixed(0)} km/h
                        </p>
                      )}
                      <Badge className={
                        truck.location.status === 'active' ? 'bg-green-100 text-green-800' :
                        truck.location.status === 'idle' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {truck.location.status}
                      </Badge>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}