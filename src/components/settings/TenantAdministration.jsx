import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Truck, Users } from 'lucide-react';
import ThemeCustomization from './admin/ThemeCustomization';
import TrucksManagement from './admin/TrucksManagement';
import MemberManagement from './admin/MemberManagement';

export default function TenantAdministration({ user }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-1 mb-6">
          <h3 className="text-lg font-semibold">Tenant Administration</h3>
          <p className="text-sm text-gray-500">
            Manage your company's settings, trucks, and team members
          </p>
        </div>

        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="theme" className="gap-2">
              <Palette className="h-4 w-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="trucks" className="gap-2">
              <Truck className="h-4 w-4" />
              Trucks
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="theme">
              <ThemeCustomization user={user} />
            </TabsContent>

            <TabsContent value="trucks">
              <TrucksManagement user={user} />
            </TabsContent>

            <TabsContent value="members">
              <MemberManagement user={user} />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}