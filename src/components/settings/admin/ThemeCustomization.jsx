import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Palette, Save } from 'lucide-react';

export default function ThemeCustomization({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const tenantId = user.tenantId || 'sec';

  const { data: theme, isLoading } = useQuery({
    queryKey: ['tenantTheme', tenantId],
    queryFn: async () => {
      const themes = await base44.entities.TenantTheme.filter({ tenantId });
      return themes[0] || {
        tenantId,
        backgroundColor: '#f9fafb',
        quickTileColor: '#3b82f6',
        deliveryTypeColorScheme: {
          primary: '#2563eb',
          secondary: '#7c3aed',
          accent: '#059669'
        }
      };
    },
  });

  const [colors, setColors] = useState({
    backgroundColor: '#f9fafb',
    quickTileColor: '#3b82f6',
    primaryColor: '#2563eb',
    secondaryColor: '#7c3aed',
    accentColor: '#059669'
  });

  React.useEffect(() => {
    if (theme) {
      setColors({
        backgroundColor: theme.backgroundColor || '#f9fafb',
        quickTileColor: theme.quickTileColor || '#3b82f6',
        primaryColor: theme.deliveryTypeColorScheme?.primary || '#2563eb',
        secondaryColor: theme.deliveryTypeColorScheme?.secondary || '#7c3aed',
        accentColor: theme.deliveryTypeColorScheme?.accent || '#059669'
      });
    }
  }, [theme]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const themeData = {
        tenantId,
        backgroundColor: colors.backgroundColor,
        quickTileColor: colors.quickTileColor,
        deliveryTypeColorScheme: {
          primary: colors.primaryColor,
          secondary: colors.secondaryColor,
          accent: colors.accentColor
        }
      };

      if (theme?.id) {
        await base44.entities.TenantTheme.update(theme.id, themeData);
      } else {
        await base44.entities.TenantTheme.create(themeData);
      }

      queryClient.invalidateQueries({ queryKey: ['tenantTheme'] });
      
      // Apply theme immediately
      document.body.style.backgroundColor = colors.backgroundColor;
      const root = document.documentElement;
      root.style.setProperty('--theme-background', colors.backgroundColor);
      root.style.setProperty('--theme-quick-tile', colors.quickTileColor);
      root.style.setProperty('--theme-primary', colors.primaryColor);
      root.style.setProperty('--theme-secondary', colors.secondaryColor);
      root.style.setProperty('--theme-accent', colors.accentColor);
      
      toast({
        title: "Theme Updated",
        description: "Your theme settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save theme settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading theme settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={colors.backgroundColor}
                  onChange={(e) => setColors({ ...colors, backgroundColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.backgroundColor}
                  onChange={(e) => setColors({ ...colors, backgroundColor: e.target.value })}
                  placeholder="#f9fafb"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quickTileColor">Quick Tile Accent</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="quickTileColor"
                  type="color"
                  value={colors.quickTileColor}
                  onChange={(e) => setColors({ ...colors, quickTileColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.quickTileColor}
                  onChange={(e) => setColors({ ...colors, quickTileColor: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Type Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="primaryColor">Primary</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="primaryColor"
                  type="color"
                  value={colors.primaryColor}
                  onChange={(e) => setColors({ ...colors, primaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.primaryColor}
                  onChange={(e) => setColors({ ...colors, primaryColor: e.target.value })}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondaryColor">Secondary</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={colors.secondaryColor}
                  onChange={(e) => setColors({ ...colors, secondaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.secondaryColor}
                  onChange={(e) => setColors({ ...colors, secondaryColor: e.target.value })}
                  placeholder="#7c3aed"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accentColor">Accent</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="accentColor"
                  type="color"
                  value={colors.accentColor}
                  onChange={(e) => setColors({ ...colors, accentColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colors.accentColor}
                  onChange={(e) => setColors({ ...colors, accentColor: e.target.value })}
                  placeholder="#059669"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Theme'}
        </Button>
      </div>
    </div>
  );
}