import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function MaintenanceOverview({ trucks, maintenanceRecords }) {
  const [filterTruck, setFilterTruck] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredRecords = maintenanceRecords.filter(record => {
    if (filterTruck !== 'all' && record.truckId !== filterTruck) return false;
    if (filterStatus !== 'all' && record.status !== filterStatus) return false;
    return true;
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

  const handleStatusChange = async (recordId, newStatus) => {
    try {
      const record = maintenanceRecords.find(r => r.id === recordId);
      await base44.entities.Maintenance.update(recordId, {
        ...record,
        status: newStatus,
        ...(newStatus === 'completed' || newStatus === 'resolved' ? {
          completedDate: new Date().toISOString()
        } : {})
      });

      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      
      toast({
        title: "Status Updated",
        description: `Maintenance status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Filter by Truck</label>
          <Select value={filterTruck} onValueChange={setFilterTruck}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trucks</SelectItem>
              {trucks.map(truck => (
                <SelectItem key={truck.id} value={truck.id}>{truck.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Filter by Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="reported">Reported</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Records ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No maintenance records found</p>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <Card key={record.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{record.truckName}</h3>
                          <Badge className={getSeverityColor(record.severity)}>
                            {record.severity}
                          </Badge>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{record.description}</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Type: {record.type} | Category: {record.category}</p>
                          <p>Reported by: {record.reportedByName} on {format(new Date(record.reportedDate), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      {record.status !== 'completed' && record.status !== 'resolved' && (
                        <Select
                          value={record.status}
                          onValueChange={(v) => handleStatusChange(record.id, v)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reported">Reported</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {record.photos && record.photos.length > 0 && (
                      <div className="grid grid-cols-6 gap-2 mt-3">
                        {record.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo, '_blank')}
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
    </div>
  );
}