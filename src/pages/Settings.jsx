import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Bell, Building2, AlertTriangle, Loader2 } from 'lucide-react';
import MyProfile from '../components/settings/MyProfile';
import PrivacyVisibility from '../components/settings/PrivacyVisibility';
import Notifications from '../components/settings/Notifications';
import TenantAdministration from '../components/settings/TenantAdministration';
import DangerZone from '../components/settings/DangerZone';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.appRole === 'globalAdmin' || 
                  currentUser?.appRole === 'tenantAdmin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access settings.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        {/* Tabs for desktop, accordion for mobile */}
        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">My Profile</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden lg:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden lg:inline">Notifications</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden lg:inline">Administration</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="danger" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden lg:inline">Leave Company</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="profile">
                <MyProfile user={currentUser} />
              </TabsContent>

              <TabsContent value="privacy">
                <PrivacyVisibility user={currentUser} />
              </TabsContent>

              <TabsContent value="notifications">
                <Notifications user={currentUser} />
              </TabsContent>

              {isAdmin && (
                <TabsContent value="admin">
                  <TenantAdministration user={currentUser} />
                </TabsContent>
              )}

              <TabsContent value="danger">
                <DangerZone user={currentUser} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Mobile: Stacked cards */}
        <div className="md:hidden space-y-4">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </h2>
            <MyProfile user={currentUser} />
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Visibility
            </h2>
            <PrivacyVisibility user={currentUser} />
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </h2>
            <Notifications user={currentUser} />
          </Card>

          {isAdmin && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tenant Administration
              </h2>
              <TenantAdministration user={currentUser} />
            </Card>
          )}

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Leave Company
            </h2>
            <DangerZone user={currentUser} />
          </Card>
        </div>
      </div>
    </div>
  );
}