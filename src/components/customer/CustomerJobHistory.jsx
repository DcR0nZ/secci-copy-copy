import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Calendar, MapPin, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import CustomerJobDetailsDialog from './CustomerJobDetailsDialog';

export default function CustomerJobHistory({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['customerJobHistory'],
    queryFn: async () => {
      const allowedCustomerIds = [
        user.customerId,
        ...(user.additionalCustomerIds || [])
      ].filter(Boolean);

      const allJobs = await base44.entities.Job.list();

      return allJobs
        .filter(job => allowedCustomerIds.includes(job.customerId))
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
  });

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.deliveryLocation?.toLowerCase().includes(query) ||
      job.poSalesDocketNumber?.toLowerCase().includes(query) ||
      job.orderNumber?.toLowerCase().includes(query) ||
      format(new Date(job.requestedDate), 'MMM dd, yyyy').toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status) => {
    const colors = {
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800',
      'RETURNED': 'bg-red-100 text-red-800',
      'IN_TRANSIT': 'bg-blue-100 text-blue-800',
      'SCHEDULED': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by location, docket number, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">
                {searchQuery ? 'No jobs found matching your search' : 'No job history available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedJob(job);
                  setDetailsOpen(true);
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {job.deliveryLocation}
                        </h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{job.deliveryTypeName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setDetailsOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        {format(new Date(job.requestedDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    
                    {job.status === 'DELIVERED' && job.actualCompletionTime && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">
                          Completed {format(new Date(job.actualCompletionTime), 'MMM dd')}
                        </span>
                      </div>
                    )}

                    {job.poSalesDocketNumber && (
                      <div className="text-gray-600 text-xs">
                        Docket: {job.poSalesDocketNumber}
                      </div>
                    )}

                    {job.podFiles && job.podFiles.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <CheckCircle className="h-3 w-3" />
                        POD Available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CustomerJobDetailsDialog
        job={selectedJob}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}