import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function AccessPending() {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = async () => {
    const callbackUrl = window.location.origin + createPageUrl('SchedulingBoard');
    await base44.auth.logout(callbackUrl);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-amber-700" />
          </div>
          <CardTitle className="text-2xl">Access pending approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-gray-600">
          <p>
            Your account is created but not yet linked to a company. An administrator needs to grant access before you can use the portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh access
            </Button>
            <Button onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
          <p className="text-sm text-gray-500 pt-2">
            If you believe this is a mistake, please contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}