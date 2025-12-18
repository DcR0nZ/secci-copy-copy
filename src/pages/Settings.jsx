import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MyProfileSection from '../components/settings/MyProfileSection';
import PrivacyVisibilitySection from '../components/settings/PrivacyVisibilitySection';
import NotificationsSection from '../components/settings/NotificationsSection';
import TenantAdminSection from '../components/settings/TenantAdminSection';
import DangerZoneSection from '../components/settings/DangerZoneSection';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user settings',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md p-8 text-center">
          <p className="text-gray-600">Please log in to access settings</p>
        </Card>
      </div>
    );
  }

  const isTenantAdmin = currentUser.appRole === 'tenantAdmin' || currentUser.appRole === 'globalAdmin' || currentUser.role === 'admin';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex-shrink-0 grid w-full grid-cols-3 lg:grid-cols-5 gap-1">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {isTenantAdmin && <TabsTrigger value="admin">Tenant Admin</TabsTrigger>}
          <TabsTrigger value="danger" className="text-red-600">Danger Zone</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-6">
          <TabsContent value="profile">
            <MyProfileSection user={currentUser} />
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacyVisibilitySection user={currentUser} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsSection user={currentUser} />
          </TabsContent>

          {isTenantAdmin && (
            <TabsContent value="admin">
              <TenantAdminSection user={currentUser} />
            </TabsContent>
          )}

          <TabsContent value="danger">
            <DangerZoneSection user={currentUser} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}