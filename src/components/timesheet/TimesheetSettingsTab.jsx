import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Save, UserPlus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TimesheetSettingsTab({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  const tenantId = user.tenantId || 'sec';

  const { data: settings, isLoading } = useQuery({
    queryKey: ['timesheetSettings', tenantId],
    queryFn: async () => {
      const settingsList = await base44.entities.TimesheetSettings.filter({ tenantId });
      return settingsList[0] || {
        tenantId,
        geofenceEnabled: false,
        geofenceName: '',
        geofenceCenterLat: -27.4698,
        geofenceCenterLng: 153.0251,
        geofenceRadiusMeters: 500,
        locationPollingSeconds: 120,
        requireManualConfirmOnEntry: false,
        allowManualShiftToggle: true
      };
    },
  });

  const { data: delegates = [] } = useQuery({
    queryKey: ['timesheetDelegates', tenantId],
    queryFn: () => base44.entities.TimesheetDelegates.filter({ tenantId }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['tenantUsers', tenantId],
    queryFn: async () => {
      const allUsers = await base44.asServiceRole.entities.User.list();
      return allUsers.filter(u => u.tenantId === tenantId);
    },
  });

  const [formData, setFormData] = useState(settings);

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.TimesheetSettings.update(settings.id, formData);
      } else {
        await base44.entities.TimesheetSettings.create(formData);
      }

      queryClient.invalidateQueries({ queryKey: ['timesheetSettings'] });
      
      toast({
        title: "Settings Saved",
        description: "Timesheet settings have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDelegate = async (userId) => {
    const selectedUser = users.find(u => u.id === userId);
    if (!selectedUser) return;

    try {
      await base44.entities.TimesheetDelegates.create({
        tenantId,
        userId: selectedUser.id,
        userName: selectedUser.full_name,
        userEmail: selectedUser.email,
        notifyDailyEmail: true,
        notifyWeeklyPdf: true
      });

      queryClient.invalidateQueries({ queryKey: ['timesheetDelegates'] });
      
      toast({
        title: "Delegate Added",
        description: `${selectedUser.full_name} will now receive timesheet summaries`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add delegate",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDelegate = async (delegateId) => {
    try {
      await base44.entities.TimesheetDelegates.delete(delegateId);
      queryClient.invalidateQueries({ queryKey: ['timesheetDelegates'] });
      
      toast({
        title: "Delegate Removed",
        description: "Delegate has been removed from timesheet summaries",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove delegate",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  const availableUsers = users.filter(u => 
    !delegates.find(d => d.userId === u.id) && u.id !== user.id
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geofence Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Geofencing</Label>
              <p className="text-sm text-gray-500">Automatically track when employees enter/exit work location</p>
            </div>
            <Switch
              checked={formData?.geofenceEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, geofenceEnabled: checked })}
            />
          </div>

          {formData?.geofenceEnabled && (
            <>
              <div>
                <Label>Location Name</Label>
                <Input
                  value={formData.geofenceName}
                  onChange={(e) => setFormData({ ...formData, geofenceName: e.target.value })}
                  placeholder="e.g., Main Office"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.geofenceCenterLat}
                    onChange={(e) => setFormData({ ...formData, geofenceCenterLat: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.geofenceCenterLng}
                    onChange={(e) => setFormData({ ...formData, geofenceCenterLng: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Radius (meters)</Label>
                <Input
                  type="number"
                  value={formData.geofenceRadiusMeters}
                  onChange={(e) => setFormData({ ...formData, geofenceRadiusMeters: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>Location Polling Interval (seconds)</Label>
                <Input
                  type="number"
                  value={formData.locationPollingSeconds}
                  onChange={(e) => setFormData({ ...formData, locationPollingSeconds: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Manual Confirmation on Entry</Label>
                  <p className="text-sm text-gray-500">Ask driver to confirm shift start when entering geofence</p>
                </div>
                <Switch
                  checked={formData.requireManualConfirmOnEntry}
                  onCheckedChange={(checked) => setFormData({ ...formData, requireManualConfirmOnEntry: checked })}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Manual Shift Toggle</Label>
              <p className="text-sm text-gray-500">Let drivers manually start/stop shifts</p>
            </div>
            <Switch
              checked={formData?.allowManualShiftToggle}
              onCheckedChange={(checked) => setFormData({ ...formData, allowManualShiftToggle: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Recipients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Delegate</Label>
            <div className="flex gap-2 mt-2">
              <Select onValueChange={handleAddDelegate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {delegates.map(delegate => (
              <div key={delegate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{delegate.userName}</p>
                  <p className="text-sm text-gray-600">{delegate.userEmail}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDelegate(delegate.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {delegates.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No delegates added</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}