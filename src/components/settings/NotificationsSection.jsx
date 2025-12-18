import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function NotificationsSection({ user }) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const prefsList = await base44.entities.NotificationPrefs.filter({ userId: user.id });
        const userPrefs = prefsList[0] || {
          userId: user.id,
          dailyRunListEmail: true,
          todaysDeliveriesEmail: true,
          todaysJobsEmail: true
        };
        setPrefs(userPrefs);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  const handleToggle = (field, value) => {
    setPrefs(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (prefs.id) {
        await base44.entities.NotificationPrefs.update(prefs.id, prefs);
      } else {
        await base44.entities.NotificationPrefs.create(prefs);
      }

      setHasChanges(false);
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="daily-run-list">Daily Run Lists</Label>
              <p className="text-sm text-gray-500">Receive daily run lists via email (for drivers)</p>
            </div>
            <Switch
              id="daily-run-list"
              checked={prefs?.dailyRunListEmail || false}
              onCheckedChange={(checked) => handleToggle('dailyRunListEmail', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="todays-deliveries">Today's Deliveries</Label>
              <p className="text-sm text-gray-500">Get notified about today's deliveries (for customers)</p>
            </div>
            <Switch
              id="todays-deliveries"
              checked={prefs?.todaysDeliveriesEmail || false}
              onCheckedChange={(checked) => handleToggle('todaysDeliveriesEmail', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="todays-jobs">Today's Jobs</Label>
              <p className="text-sm text-gray-500">Receive updates about today's jobs (for outreach)</p>
            </div>
            <Switch
              id="todays-jobs"
              checked={prefs?.todaysJobsEmail || false}
              onCheckedChange={(checked) => handleToggle('todaysJobsEmail', checked)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}