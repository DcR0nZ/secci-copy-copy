import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Briefcase, 
  CheckCircle, 
  Calendar, 
  UserPlus, 
  AlertCircle, 
  Truck,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const [jobs, users] = await Promise.all([
          base44.entities.Job.list('-updated_date', 20),
          base44.entities.User.list('-updated_date', 10)
        ]);

        const jobActivities = jobs.map(job => ({
          id: job.id,
          type: getJobActivityType(job),
          title: getJobActivityTitle(job),
          description: `${job.customerName} - ${job.deliveryLocation}`,
          timestamp: job.updated_date,
          metadata: { status: job.status, customerName: job.customerName }
        }));

        const userActivities = users
          .filter(user => user.display_name || user.full_name)
          .map(user => ({
            id: `user-${user.id}`,
            type: 'user_update',
            title: 'User Profile Updated',
            description: user.display_name || user.full_name || user.email,
            timestamp: user.updated_date,
            metadata: { email: user.email }
          }));

        const combined = [...jobActivities, ...userActivities]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 15);

        setActivities(combined);
      } catch (error) {
        console.error('Failed to load activity feed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const getJobActivityType = (job) => {
    if (job.status === 'DELIVERED') return 'job_completed';
    if (job.status === 'SCHEDULED') return 'job_scheduled';
    if (job.status === 'RETURNED') return 'job_returned';
    if (job.status === 'CANCELLED') return 'job_cancelled';
    if (job.status === 'APPROVED') return 'job_approved';
    return 'job_created';
  };

  const getJobActivityTitle = (job) => {
    const statusTitles = {
      'DELIVERED': 'Job Completed',
      'SCHEDULED': 'Job Scheduled',
      'RETURNED': 'Job Returned',
      'CANCELLED': 'Job Cancelled',
      'APPROVED': 'Job Approved',
      'PENDING_APPROVAL': 'New Job Created',
      'IN_TRANSIT': 'Job In Transit'
    };
    return statusTitles[job.status] || 'Job Updated';
  };

  const getActivityIcon = (type) => {
    const iconMap = {
      'job_created': <Briefcase className="h-4 w-4" />,
      'job_completed': <CheckCircle className="h-4 w-4" />,
      'job_scheduled': <Calendar className="h-4 w-4" />,
      'job_returned': <RotateCcw className="h-4 w-4" />,
      'job_cancelled': <AlertCircle className="h-4 w-4" />,
      'job_approved': <CheckCircle className="h-4 w-4" />,
      'user_update': <UserPlus className="h-4 w-4" />,
      'truck_update': <Truck className="h-4 w-4" />
    };
    return iconMap[type] || <Briefcase className="h-4 w-4" />;
  };

  const getActivityColor = (type) => {
    const colorMap = {
      'job_created': 'bg-blue-100 text-blue-700',
      'job_completed': 'bg-green-100 text-green-700',
      'job_scheduled': 'bg-purple-100 text-purple-700',
      'job_returned': 'bg-orange-100 text-orange-700',
      'job_cancelled': 'bg-red-100 text-red-700',
      'job_approved': 'bg-emerald-100 text-emerald-700',
      'user_update': 'bg-indigo-100 text-indigo-700',
      'truck_update': 'bg-cyan-100 text-cyan-700'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status) => {
    const badgeColors = {
      'DELIVERED': 'bg-green-100 text-green-800',
      'SCHEDULED': 'bg-blue-100 text-blue-800',
      'RETURNED': 'bg-orange-100 text-orange-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'APPROVED': 'bg-emerald-100 text-emerald-800',
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-800',
      'IN_TRANSIT': 'bg-indigo-100 text-indigo-800'
    };
    return badgeColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.description}
                      </p>
                    </div>
                    {activity.metadata?.status && (
                      <Badge className={getStatusBadge(activity.metadata.status)}>
                        {activity.metadata.status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}