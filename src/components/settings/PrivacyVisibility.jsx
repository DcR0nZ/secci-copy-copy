import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PrivacyVisibility({ user }) {
  const [visibility, setVisibility] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    isVisibleExternally: false,
    visibleToAllTenants: false,
    allowedTenantIds: []
  });
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [visibilityList, tenantList] = await Promise.all([
          base44.entities.UserVisibility.filter({ userId: user.id }),
          base44.entities.Tenant.list()
        ]);

        const userVisibility = visibilityList[0];
        setVisibility(userVisibility);
        setTenants(tenantList.filter(t => t.tenantId !== user.tenantId));

        if (userVisibility) {
          setFormData({
            isVisibleExternally: userVisibility.isVisibleExternally || false,
            visibleToAllTenants: userVisibility.visibleToAllTenants || false,
            allowedTenantIds: userVisibility.allowedTenantIds || []
          });
        }
      } catch (error) {
        console.error('Failed to load visibility settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.id, user.tenantId]);

  const handleToggleExternal = (checked) => {
    setFormData(prev => ({
      ...prev,
      isVisibleExternally: checked,
      visibleToAllTenants: checked ? prev.visibleToAllTenants : false,
      allowedTenantIds: checked ? prev.allowedTenantIds : []
    }));
    setHasChanges(true);
  };

  const handleModeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      visibleToAllTenants: value === 'all',
      allowedTenantIds: value === 'all' ? [] : prev.allowedTenantIds
    }));
    setHasChanges(true);
  };

  const handleAddTenant = (tenantId) => {
    if (!formData.allowedTenantIds.includes(tenantId)) {
      setFormData(prev => ({
        ...prev,
        allowedTenantIds: [...prev.allowedTenantIds, tenantId]
      }));
      setHasChanges(true);
    }
  };

  const handleRemoveTenant = (tenantId) => {
    setFormData(prev => ({
      ...prev,
      allowedTenantIds: prev.allowedTenantIds.filter(id => id !== tenantId)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (formData.isVisibleExternally && !formData.visibleToAllTenants && formData.allowedTenantIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one tenant or choose "All tenants"',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      if (visibility) {
        await base44.entities.UserVisibility.update(visibility.id, {
          ...formData,
          userId: user.id
        });
      } else {
        await base44.entities.UserVisibility.create({
          ...formData,
          userId: user.id
        });
      }

      setHasChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'Your visibility preferences have been updated'
      });
    } catch (error) {
      console.error('Failed to save visibility settings:', error);
      toast({
        title: 'Save Failed',
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
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="external-visibility">Appear in other companies' Phonebooks?</Label>
            <p className="text-sm text-gray-500">
              Allow your contact information to be visible to other organizations
            </p>
          </div>
          <Switch
            id="external-visibility"
            checked={formData.isVisibleExternally}
            onCheckedChange={handleToggleExternal}
          />
        </div>

        {formData.isVisibleExternally && (
          <>
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              <Label>Visibility Mode</Label>
              <RadioGroup
                value={formData.visibleToAllTenants ? 'all' : 'selected'}
                onValueChange={handleModeChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="mode-all" />
                  <Label htmlFor="mode-all" className="font-normal cursor-pointer">
                    All tenants (visible to any company)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="mode-selected" />
                  <Label htmlFor="mode-selected" className="font-normal cursor-pointer">
                    Selected tenants only
                  </Label>
                </div>
              </RadioGroup>

              {!formData.visibleToAllTenants && (
                <div className="space-y-3">
                  <Label>Select Companies</Label>
                  
                  {formData.allowedTenantIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.allowedTenantIds.map(tenantId => {
                        const tenant = tenants.find(t => t.tenantId === tenantId);
                        return (
                          <Badge key={tenantId} variant="secondary" className="pl-3 pr-1">
                            {tenant?.name || tenantId}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                              onClick={() => handleRemoveTenant(tenantId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <Select onValueChange={handleAddTenant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add a company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants
                        .filter(t => !formData.allowedTenantIds.includes(t.tenantId))
                        .map(tenant => (
                          <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end">
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