import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Calendar } from 'lucide-react';
import TimesheetSettingsTab from '../components/timesheet/TimesheetSettingsTab';
import RostersTab from '../components/timesheet/RostersTab';
import TimesheetReviewTab from '../components/timesheet/TimesheetReviewTab';

export default function TimesheetsAndRostersPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin' || user?.appRole === 'tenantAdmin' || user?.appRole === 'globalAdmin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin access to view this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Timesheets & Rosters</h1>
          <p className="text-gray-600 mt-1">Manage employee timesheets, rosters, and work schedules</p>
        </div>

        <Tabs defaultValue="rosters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rosters" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Rosters</span>
            </TabsTrigger>
            <TabsTrigger value="timesheets" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Timesheets</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="rosters">
              <RostersTab user={user} />
            </TabsContent>

            <TabsContent value="timesheets">
              <TimesheetReviewTab user={user} />
            </TabsContent>

            <TabsContent value="settings">
              <TimesheetSettingsTab user={user} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}