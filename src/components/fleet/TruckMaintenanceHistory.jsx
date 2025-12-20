import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function TruckMaintenanceHistory({ truck, open, onClose }) {
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['truckMaintenance', truck?.id],
    queryFn: () => base44.entities.Maintenance.filter({ truckId: truck.id }, '-created_date'),
    enabled: !!truck && open,
  });

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      resolved: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maintenance History - {truck?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {maintenanceRecords.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No maintenance records</p>
          ) : (
            maintenanceRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{record.description}</h3>
                        <Badge className={getSeverityColor(record.severity)}>
                          {record.severity}
                        </Badge>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Type: {record.type} | Category: {record.category}</p>
                        <p>Reported by: {record.reportedByName}</p>
                        <p>Date: {format(new Date(record.reportedDate), 'MMM dd, yyyy HH:mm')}</p>
                        {record.odometerReading && (
                          <p>Odometer: {record.odometerReading.toLocaleString()} km</p>
                        )}
                        {record.completedDate && (
                          <p>Completed: {format(new Date(record.completedDate), 'MMM dd, yyyy')}</p>
                        )}
                        {record.cost && (
                          <p>Cost: ${record.cost.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {record.notes && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-3">
                      {record.notes}
                    </p>
                  )}
                  {record.photos && record.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {record.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}