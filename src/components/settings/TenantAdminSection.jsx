import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TenantThemeSettings from './TenantThemeSettings';
import TrucksManagement from './TrucksManagement';
import MemberManagement from './MemberManagement';

export default function TenantAdminSection({ user }) {
  return (
    <Tabs defaultValue="theme" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="trucks">Trucks</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
      </TabsList>

      <TabsContent value="theme">
        <TenantThemeSettings user={user} />
      </TabsContent>

      <TabsContent value="trucks">
        <TrucksManagement user={user} />
      </TabsContent>

      <TabsContent value="members">
        <MemberManagement user={user} />
      </TabsContent>
    </Tabs>
  );
}