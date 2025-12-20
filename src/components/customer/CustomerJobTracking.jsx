import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  MapPin,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  Navigation,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import CustomerJobDetailsDialog from './CustomerJobDetailsDialog';

export default function CustomerJobTracking({ user }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: activeJobs = [], isLoading } = useQuery({
    queryKey: ['customerActiveJobs'],
    queryFn: async () => {
      const allowedCustomerIds = [
        user.customerId,
        ...(user.additionalCustomerIds || [])
      ].filter(Boolean);

      const [allJobs, allAssignments] = await Promise.all([
        base44.entities.Job.list(),
        base44.entities.Assignment.list()
      ]);

      return allJobs
        .filter(job => 
          allowedCustomerIds.includes(job.customerId) &&
          ['APPROVED', 'SCHEDULED', 'IN_TRANSIT'].includes(job.status)
        )
        .map(job => {
          const assignment = allAssignments.find(a => a.jobId === job.id);
          return { ...job, assignment };
        })
        .sort((a, b) => {
          if (a.assignment && b.assignment) {
            return new Date(a.assignment.date) - new Date(b.assignment.date);
          }
          return new Date(a.requestedDate) - new Date(b.requestedDate);
        });
    },
    refetchInterval: 10000,
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'IN_TRANSIT':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'SCHEDULED':
        return <Clock className="h-5 w-5 text-purple-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDriverStatusBadge = (driverStatus) => {
    const statusConfig = {
      'EN_ROUTE': { label: 'On the way', color: 'bg-blue-100 text-blue-800' },
      'ARRIVED': { label: 'Driver arrived', color: 'bg-purple-100 text-purple-800' },
      'UNLOADING': { label: 'Unloading', color: 'bg-orange-100 text-orange-800' },
      'PROBLEM': { label: 'Issue reported', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[driverStatus];
    if (!config) return null;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activeJobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Active Deliveries
          </h3>
          <p className="text-gray-600">
            All your deliveries are completed. Check the History tab to view past deliveries.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {activeJobs.map((job) => (
          <Card
            key={job.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedJob(job);
              setDetailsOpen(true);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      Delivery to {job.deliveryLocation}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {job.deliveryTypeName}
                    </p>
                  </div>
                </div>
                {job.driverStatus && getDriverStatusBadge(job.driverStatus)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{job.deliveryLocation}</span>
                </div>

                {job.assignment && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      Scheduled: {format(new Date(job.assignment.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}

                {job.deliveryWindow && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      Window: {job.deliveryWindow}
                    </span>
                  </div>
                )}

                {job.estimatedArrivalTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Navigation className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      ETA: {job.estimatedArrivalTime}
                    </span>
                  </div>
                )}
              </div>

              {job.driverStatus === 'PROBLEM' && job.problemDetails && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Issue Reported</p>
                      <p className="text-sm text-red-700">{job.problemDetails}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-xs">
                  {job.status.replace('_', ' ')}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedJob(job);
                    setDetailsOpen(true);
                  }}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CustomerJobDetailsDialog
        job={selectedJob}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}