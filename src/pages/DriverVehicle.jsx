import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Truck, Wrench, AlertTriangle, Plus, CheckCircle } from 'lucide-react';
import LogMaintenanceDialog from '../components/fleet/LogMaintenanceDialog';
import { format } from 'date-fns';

export default function DriverVehiclePage() {
  const [user, setUser] = useState(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  const { data: truck, isLoading: truckLoading } = useQuery({
    queryKey: ['driverTruck'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (!currentUser.truck) return null;
      
      const trucks = await base44.entities.Truck.filter({ id: currentUser.truck });
      return trucks[0] || null;
    },
  });

  const { data: maintenanceRecords = [], refetch } = useQuery({
    queryKey: ['driverMaintenance', truck?.id],
    queryFn: () => base44.entities.Maintenance.filter({ truckId: truck.id }, '-created_date'),
    enabled: !!truck,
  });

  const myRecords = maintenanceRecords.filter(m => m.reportedBy === user?.email);
  const openIssues = myRecords.filter(m => m.status !== 'completed' && m.status !== 'resolved');

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

  if (truckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Truck Assigned</h3>
            <p className="text-gray-600">You don't have a truck assigned yet. Contact your dispatcher.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Vehicle</h1>
        <p className="text-gray-600 mt-1">Vehicle maintenance and issue reporting</p>
      </div>

      {/* Truck Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{truck.name}</h2>
              <p className="text-gray-600">Capacity: {truck.capacity} tonnes</p>
            </div>
            <Button onClick={() => setLogDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Log Maintenance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-3xl font-bold text-gray-900">{myRecords.length}</p>
              </div>
              <Wrench className="h-10 w-10 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Issues</p>
                <p className="text-3xl font-bold text-orange-600">{openIssues.length}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-green-600">
                  {myRecords.filter(m => m.status === 'resolved' || m.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance History</CardTitle>
        </CardHeader>
        <CardContent>
          {myRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No maintenance records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRecords.map((record) => (
                <Card key={record.id} className="border">
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
                          <p>Category: {record.category}</p>
                          <p>Type: {record.type}</p>
                          <p>Reported: {format(new Date(record.reportedDate), 'MMM dd, yyyy HH:mm')}</p>
                          {record.completedDate && (
                            <p>Completed: {format(new Date(record.completedDate), 'MMM dd, yyyy')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {record.notes && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {record.notes}
                      </p>
                    )}
                    {record.photos && record.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {record.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-20 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <LogMaintenanceDialog
        truck={truck}
        user={user}
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onSuccess={() => {
          refetch();
          setLogDialogOpen(false);
        }}
      />
    </div>
  );
}