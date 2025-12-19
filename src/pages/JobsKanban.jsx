import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { Grip, Calendar, MapPin, User, Truck as TruckIcon, Clock } from 'lucide-react';
import JobDetailsDialog from '../components/scheduling/JobDetailsDialog';
import { format } from 'date-fns';

const STATUS_COLUMNS = [
  { id: 'APPROVED', label: 'Approved', color: 'bg-blue-50 border-blue-200' },
  { id: 'SCHEDULED', label: 'Scheduled', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'IN_TRANSIT', label: 'In Transit', color: 'bg-purple-50 border-purple-200' },
  { id: 'DELIVERED', label: 'Delivered', color: 'bg-green-50 border-green-200' },
];

const JobCard = ({ job, onClick }) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow mb-3"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{job.customerName}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{job.deliveryLocation}</span>
            </div>
          </div>
          <Grip className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
        
        <div className="space-y-1">
          {job.estimatedArrivalTime && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>ETA: {job.estimatedArrivalTime}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(job.requestedDate), 'MMM d, yyyy')}</span>
          </div>
          {job.siteContactName && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <User className="h-3 w-3" />
              <span>{job.siteContactName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {job.deliveryTypeName}
          </Badge>
          {job.isDifficultDelivery && (
            <Badge className="bg-orange-500 text-white text-xs">
              Difficult
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const KanbanColumn = ({ status, jobs, onJobClick }) => {
  const column = STATUS_COLUMNS.find(c => c.id === status);
  
  return (
    <div className={`flex-1 min-w-[280px] rounded-lg border-2 ${column.color} p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{column.label}</h3>
        <Badge variant="secondary">{jobs.length}</Badge>
      </div>
      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
        ))}
        {jobs.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No jobs
          </div>
        )}
      </div>
    </div>
  );
};

export default function JobsKanbanPage() {
  const [user, setUser] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['kanbanJobs'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const allJobs = await base44.entities.Job.list();
      
      // Filter based on user permissions
      const isCustomer = currentUser.role !== 'admin' && currentUser.appRole !== 'dispatcher';
      if (isCustomer && (currentUser.customerId || currentUser.additionalCustomerIds?.length > 0)) {
        const allowedCustomerIds = [
          currentUser.customerId,
          ...(currentUser.additionalCustomerIds || [])
        ].filter(Boolean);
        return allJobs.filter(job => allowedCustomerIds.includes(job.customerId));
      }
      
      const currentTenant = currentUser.tenantId || 'sec';
      const isGlobalAdmin = currentUser.appRole === 'globalAdmin';
      
      if (!isGlobalAdmin) {
        return allJobs.filter(job => {
          const isOwner = job.tenantId === currentTenant || !job.tenantId;
          const isTagged = job.taggedTenantIds?.includes(currentTenant);
          return isOwner || isTagged;
        });
      }
      
      return allJobs;
    },
    refetchInterval: 30000,
  });

  const getJobsByStatus = (status) => {
    return jobs.filter(job => job.status === status);
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs Kanban Board</h1>
          <p className="text-gray-600 mt-1">Visual overview of job progress</p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              status={column.id}
              jobs={getJobsByStatus(column.id)}
              onJobClick={handleJobClick}
            />
          ))}
        </div>
      </div>

      <JobDetailsDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onJobUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['kanbanJobs'] });
          setDialogOpen(false);
        }}
      />
    </>
  );
}