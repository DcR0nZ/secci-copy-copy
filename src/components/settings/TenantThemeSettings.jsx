import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_THEME = {
  backgroundColor: '#f3f4f6',
  quickTileColor: '#3b82f6',
  deliveryTypeColor: '#8b5cf6'
};

export default function TenantThemeSettings({ user }) {
  const [tenant, setTenant] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const tenants = await base44.entities.Tenant.filter({ tenantId: user.tenantId || 'sec' });
        const userTenant = tenants[0];
        
        if (userTenant) {
          setTenant(userTenant);
          setTheme(userTenant.settings?.theme || DEFAULT_THEME);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  const handleColorChange = (field, value) => {
    setTheme(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!tenant) {
      toast({
        title: 'Error',
        description: 'Tenant not found',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const updatedSettings = { ...tenant.settings, theme };
      await base44.entities.Tenant.update(tenant.id, { 
        ...tenant,
        settings: updatedSettings 
      });

      setHasChanges(false);
      toast({
        title: 'Theme saved',
        description: 'Your theme preferences have been updated'
      });
    } catch (error) {
      console.error('Error saving theme:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save theme settings',
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
        <CardTitle>Customize UI Theme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={theme.backgroundColor}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  value={theme.backgroundColor}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                  placeholder="#f3f4f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tile-color">Quick Tile Color</Label>
              <div className="flex gap-2">
                <Input
                  id="tile-color"
                  type="color"
                  value={theme.quickTileColor}
                  onChange={(e) => handleColorChange('quickTileColor', e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  value={theme.quickTileColor}
                  onChange={(e) => handleColorChange('quickTileColor', e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-color">Delivery Type Color</Label>
              <div className="flex gap-2">
                <Input
                  id="delivery-color"
                  type="color"
                  value={theme.deliveryTypeColor}
                  onChange={(e) => handleColorChange('deliveryTypeColor', e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  value={theme.deliveryTypeColor}
                  onChange={(e) => handleColorChange('deliveryTypeColor', e.target.value)}
                  placeholder="#8b5cf6"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div 
              className="border rounded-lg p-6 space-y-4"
              style={{ backgroundColor: theme.backgroundColor }}
            >
              <div 
                className="rounded-lg p-4 text-white font-semibold"
                style={{ backgroundColor: theme.quickTileColor }}
              >
                Quick Tile Sample
              </div>
              <div 
                className="rounded-lg p-4 text-white font-semibold"
                style={{ backgroundColor: theme.deliveryTypeColor }}
              >
                Delivery Type Sample
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Theme'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}