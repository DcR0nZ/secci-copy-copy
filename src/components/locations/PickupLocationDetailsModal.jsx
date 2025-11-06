import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MapPin, Building2, Package, Edit, Trash2, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PickupLocationDetailsModal({ 
  location, 
  open, 
  onOpenChange,
  onEdit,
  onDelete
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);

  useEffect(() => {
    if (open && location) {
      geocodeAddress();
    }
  }, [open, location]);

  const geocodeAddress = async () => {
    if (!location?.address) return;
    
    setLoadingMap(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setCoordinates({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setLoadingMap(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(location.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!location) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {location.name}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">{location.company}</p>
                {location.shortname && (
                  <p className="text-xs text-blue-600 mt-1 font-mono font-semibold">
                    {location.shortname}
                  </p>
                )}
              </div>
              <Badge className={getStatusColor(location.status)}>
                {location.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {location.sheetType && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sheet Type
                </h3>
                <p className="text-sm font-medium">{location.sheetType}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Address
              </h3>
              <p className="text-sm text-gray-700 mb-3">{location.address}</p>
              
              <div className="w-full h-64 bg-gray-200 rounded overflow-hidden relative">
                {loadingMap ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : coordinates ? (
                  <MapContainer
                    center={[coordinates.lat, coordinates.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[coordinates.lat, coordinates.lng]}>
                      <Popup>
                        <div className="text-sm">
                          <strong>{location.name}</strong>
                          <br />
                          {location.address}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                    Could not load map
                  </div>
                )}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Store Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Company:</span>
                  <p className="font-medium">{location.company}</p>
                </div>
                <div>
                  <span className="text-gray-500">Store Name:</span>
                  <p className="font-medium">{location.name}</p>
                </div>
                {location.shortname && (
                  <div>
                    <span className="text-gray-500">Short Name:</span>
                    <p className="font-medium font-mono">{location.shortname}</p>
                  </div>
                )}
                {location.sheetType && (
                  <div>
                    <span className="text-gray-500">Sheet Type:</span>
                    <p className="font-medium">{location.sheetType}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
              Close
            </Button>
            <div className="flex gap-2 flex-1 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  onEdit(location);
                  onOpenChange(false);
                }}
                disabled={deleting}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pickup Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{location.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}