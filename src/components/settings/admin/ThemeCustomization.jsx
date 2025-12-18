import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_THEME = {
  backgroundColor: '#f9fafb',
  quickTileColor: '#3b82f6',
  deliveryTypeColorScheme: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#059669'
  }
};

export default function ThemeCustomization({ user }) {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_THEME);
  const { toast } = useToast();

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const themes = await base44.entities.TenantTheme.filter({ tenantId: user.tenantId });
        const tenantTheme = themes[0];
        setTheme(tenantTheme);

        if (tenantTheme) {
          setFormData({
            backgroundColor: tenantTheme.backgroundColor || DEFAULT_THEME.backgroundColor,
            quickTileColor: tenantTheme.quickTileColor || DEFAULT_THEME.quickTileColor,
            deliveryTypeColorScheme: tenantTheme.deliveryTypeColorScheme || DEFAULT_THEME.deliveryTypeColorScheme
          });
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [user.tenantId]);

  const handleColorChange = (path, value) => {
    setFormData(prev => {
      if (path.includes('.')) {
        const [parent, child] = path.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return { ...prev, [path]: value };
    });
    setHasChanges(true);
  };

  const handleReset = () => {
    setFormData(DEFAULT_THEME);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (theme) {
        await base44.entities.TenantTheme.update(theme.id, {
          ...formData,
          tenantId: user.tenantId
        });
      } else {
        await base44.entities.TenantTheme.create({
          ...formData,
          tenantId: user.tenantId
        });
      }

      // Log audit
      await base44.entities.AuditLog.create({
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.display_name || user.full_name || user.email,
        action: 'theme_updated',
        metadata: { colors: formData }
      });

      setHasChanges(false);
      toast({
        title: 'Theme Saved',
        description: 'Your theme customization has been applied'
      });
    } catch (error) {
      console.error('Failed to save theme:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save theme settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Panel */}
      <div className="border rounded-lg p-4" style={{ backgroundColor: formData.backgroundColor }}>
        <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
        <div className="flex gap-3">
          <div
            className="h-16 w-16 rounded-lg shadow-sm"
            style={{ backgroundColor: formData.quickTileColor }}
          />
          <div
            className="h-16 w-16 rounded-lg shadow-sm"
            style={{ backgroundColor: formData.deliveryTypeColorScheme.primary }}
          />
          <div
            className="h-16 w-16 rounded-lg shadow-sm"
            style={{ backgroundColor: formData.deliveryTypeColorScheme.secondary }}
          />
          <div
            className="h-16 w-16 rounded-lg shadow-sm"
            style={{ backgroundColor: formData.deliveryTypeColorScheme.accent }}
          />
        </div>
      </div>

      {/* Color Inputs */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bg-color">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="bg-color"
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={formData.backgroundColor}
                onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                placeholder="#f9fafb"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tile-color">Quick Tile Color</Label>
            <div className="flex gap-2">
              <Input
                id="tile-color"
                type="color"
                value={formData.quickTileColor}
                onChange={(e) => handleColorChange('quickTileColor', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={formData.quickTileColor}
                onChange={(e) => handleColorChange('quickTileColor', e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Delivery Type Colors</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={formData.deliveryTypeColorScheme.primary}
                  onChange={(e) => handleColorChange('deliveryTypeColorScheme.primary', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.deliveryTypeColorScheme.primary}
                  onChange={(e) => handleColorChange('deliveryTypeColorScheme.primary', e.target.value)}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={formData.deliveryTypeColorScheme.secondary}
                  onChange={(e) => handleColorChange('deliveryTypeColorScheme.secondary', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.deliveryTypeColorScheme.secondary}
                  onChange={(e) => handleColorChange('deliveryTypeColorScheme.secondary', e.target.value)}
                  placeholder="#7c3aed"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={formData.deliveryTypeColorScheme.accent}
                  onChange={(e) => handleColorChange('deliveryTypeColorScheme.accent', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.deliveryTypeColorScheme.accent}
                  onChange={(e) => handleColorChange('deliveryTypeColorScheme.accent', e.target.value)}
                  placeholder="#059669"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
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
    </div>
  );
}