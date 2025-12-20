import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Clock,
  CheckCircle,
  FileText,
  User,
  Plus
} from 'lucide-react';
import CustomerJobTracking from '../components/customer/CustomerJobTracking';
import CustomerJobHistory from '../components/customer/CustomerJobHistory';
import CustomerProfile from '../components/customer/CustomerProfile';
import CustomerNewRequest from '../components/customer/CustomerNewRequest';

export default function CustomerPortalPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['customerStats'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allowedCustomerIds = [
        currentUser.customerId,
        ...(currentUser.additionalCustomerIds || [])
      ].filter(Boolean);

      const allJobs = await base44.entities.Job.list();
      const customerJobs = allJobs.filter(job => 
        allowedCustomerIds.includes(job.customerId)
      );

      const activeJobs = customerJobs.filter(j => 
        ['APPROVED', 'SCHEDULED', 'IN_TRANSIT'].includes(j.status)
      ).length;

      const completedToday = customerJobs.filter(j => {
        if (j.status !== 'DELIVERED') return false;
        const completedDate = new Date(j.actualCompletionTime || j.updated_date);
        const today = new Date();
        return completedDate.toDateString() === today.toDateString();
      }).length;

      const pendingApproval = customerJobs.filter(j => 
        j.status === 'PENDING_APPROVAL'
      ).length;

      return {
        activeJobs,
        completedToday,
        pendingApproval,
        totalJobs: customerJobs.length
      };
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (!currentUser.customerId && !currentUser.additionalCustomerIds?.length) {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('User check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.full_name}
        </h1>
        <p className="text-gray-600 mt-1">
          Track your deliveries and manage your account
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats?.activeJobs || 0}
                </p>
              </div>
              <Package className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.completedToday || 0}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.pendingApproval || 0}
                </p>
              </div>
              <Clock className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.totalJobs || 0}
                </p>
              </div>
              <FileText className="h-10 w-10 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Portal Tabs */}
      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracking">
            <Package className="h-4 w-4 mr-2" />
            Live Tracking
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            Job History
          </TabsTrigger>
          <TabsTrigger value="new-request">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="mt-6">
          <CustomerJobTracking user={user} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <CustomerJobHistory user={user} />
        </TabsContent>

        <TabsContent value="new-request" className="mt-6">
          <CustomerNewRequest user={user} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <CustomerProfile user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}