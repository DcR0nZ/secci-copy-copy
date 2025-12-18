import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Notifications({ user }) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    dailyRunListEmail: true,
    todaysDeliveriesEmail: true,
    todaysJobsEmail: true,
    jobStatusUpdates: true
  });
  const { toast } = useToast();

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefsList = await base44.entities.NotificationPrefs.filter({ userId: user.id });
        const userPrefs = prefsList[0];
        setPrefs(userPrefs);

        if (userPrefs) {
          setFormData({
            dailyRunListEmail: userPrefs.dailyRunListEmail ?? true,
            todaysDeliveriesEmail: userPrefs.todaysDeliveriesEmail ?? true,
            todaysJobsEmail: userPrefs.todaysJobsEmail ?? true,
            jobStatusUpdates: userPrefs.jobStatusUpdates ?? true
          });
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, [user.id]);

  const handleToggle = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (prefs) {
        await base44.entities.NotificationPrefs.update(prefs.id, {
          ...formData,
          userId: user.id
        });
      } else {
        await base44.entities.NotificationPrefs.create({
          ...formData,
          userId: user.id
        });
      }

      setHasChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated'
      });
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      toast({
        title: 'Save Failed',
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
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const notifications = [
    {
      id: 'dailyRunListEmail',
      label: 'Daily Run Lists',
      description: 'Receive your daily delivery schedule each morning',
      roles: ['driver']
    },
    {
      id: 'todaysDeliveriesEmail',
      label: "Today's Deliveries",
      description: 'Get notified about deliveries scheduled for your locations',
      roles: ['customer', 'manager']
    },
    {
      id: 'todaysJobsEmail',
      label: "Today's Jobs",
      description: 'Daily summary of jobs assigned to you',
      roles: ['outreach', 'outreachOperator']
    },
    {
      id: 'jobStatusUpdates',
      label: 'Job Status Updates',
      description: 'Notifications when job status changes (scheduled, completed, etc.)',
      roles: ['all']
    }
  ];

  const relevantNotifications = notifications.filter(notif => 
    notif.roles.includes('all') || notif.roles.includes(user.appRole)
  );

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Email Notifications</h3>
          <p className="text-sm text-gray-500">
            Choose which notifications you want to receive via email
          </p>
        </div>

        {relevantNotifications.map(notif => (
          <div key={notif.id} className="flex items-start justify-between gap-4 py-3 border-b last:border-b-0">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor={notif.id} className="text-base font-medium">
                {notif.label}
              </Label>
              <p className="text-sm text-gray-500">
                {notif.description}
              </p>
            </div>
            <Switch
              id={notif.id}
              checked={formData[notif.id]}
              onCheckedChange={(checked) => handleToggle(notif.id, checked)}
            />
          </div>
        ))}

        {relevantNotifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No notification settings available for your role</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
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