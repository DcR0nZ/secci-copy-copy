import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PrivacyVisibilitySection({ user }) {
  const [visibility, setVisibility] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const [visibilityList, tenantsList] = await Promise.all([
          base44.entities.UserVisibility.filter({ userId: user.id }),
          base44.entities.Tenant.list()
        ]);

        const userVisibility = visibilityList[0] || {
          userId: user.id,
          isVisibleExternally: false,
          visibleToAllTenants: false,
          allowedTenantIds: []
        };

        setVisibility(userVisibility);
        setTenants(tenantsList.filter(t => t.tenantId !== user.tenantId));
      } catch (error) {
        console.error('Error loading visibility settings:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  const handleToggleExternal = (checked) => {
    setVisibility(prev => ({
      ...prev,
      isVisibleExternally: checked,
      visibleToAllTenants: checked ? prev.visibleToAllTenants : false,
      allowedTenantIds: checked ? prev.allowedTenantIds : []
    }));
    setHasChanges(true);
  };

  const handleModeChange = (mode) => {
    setVisibility(prev => ({
      ...prev,
      visibleToAllTenants: mode === 'all',
      allowedTenantIds: mode === 'all' ? [] : prev.allowedTenantIds
    }));
    setHasChanges(true);
  };

  const handleTenantToggle = (tenantId, checked) => {
    setVisibility(prev => ({
      ...prev,
      allowedTenantIds: checked
        ? [...prev.allowedTenantIds, tenantId]
        : prev.allowedTenantIds.filter(id => id !== tenantId)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validation
    if (visibility.isVisibleExternally && !visibility.visibleToAllTenants && visibility.allowedTenantIds.length === 0) {
      toast({
        title: 'Validation error',
        description: 'Please select at least one tenant or choose "All tenants"',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      if (visibility.id) {
        await base44.entities.UserVisibility.update(visibility.id, visibility);
      } else {
        await base44.entities.UserVisibility.create(visibility);
      }

      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: 'Your visibility preferences have been updated'
      });
    } catch (error) {
      console.error('Error saving visibility:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save visibility settings',
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
        <CardTitle>Privacy & Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="external-visibility">Appear in other companies' Phonebooks?</Label>
            <p className="text-sm text-gray-500">Allow users from other tenants to see your contact information</p>
          </div>
          <Switch
            id="external-visibility"
            checked={visibility?.isVisibleExternally || false}
            onCheckedChange={handleToggleExternal}
          />
        </div>

        {visibility?.isVisibleExternally && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            <RadioGroup
              value={visibility.visibleToAllTenants ? 'all' : 'selected'}
              onValueChange={handleModeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-tenants" />
                <Label htmlFor="all-tenants" className="font-normal">
                  All tenants (visible to everyone)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected-tenants" />
                <Label htmlFor="selected-tenants" className="font-normal">
                  Selected tenants only
                </Label>
              </div>
            </RadioGroup>

            {!visibility.visibleToAllTenants && (
              <div className="space-y-2">
                <Label>Choose which tenants can see you:</Label>
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  {tenants.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No other tenants available</p>
                  ) : (
                    <div className="space-y-2">
                      {tenants.map(tenant => (
                        <div key={tenant.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tenant-${tenant.id}`}
                            checked={visibility.allowedTenantIds?.includes(tenant.tenantId)}
                            onCheckedChange={(checked) => handleTenantToggle(tenant.tenantId, checked)}
                          />
                          <Label htmlFor={`tenant-${tenant.id}`} className="font-normal">
                            {tenant.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        )}

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