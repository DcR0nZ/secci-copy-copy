import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Palette, Save, Check } from 'lucide-react';

const THEMES = {
  default: {
    name: 'Default',
    description: 'Clean and professional light theme',
    backgroundColor: '#f9fafb',
    quickTileColor: '#3b82f6',
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#059669'
  },
  dark: {
    name: 'Dark',
    description: 'Easy on the eyes dark mode',
    backgroundColor: '#1f2937',
    quickTileColor: '#3b82f6',
    primary: '#60a5fa',
    secondary: '#a78bfa',
    accent: '#34d399'
  },
  slate: {
    name: 'Slate',
    description: 'Professional gray monochrome',
    backgroundColor: '#f8fafc',
    quickTileColor: '#64748b',
    primary: '#475569',
    secondary: '#64748b',
    accent: '#94a3b8'
  },
  sage: {
    name: 'Sage',
    description: 'Calming green monochrome',
    backgroundColor: '#f0fdf4',
    quickTileColor: '#16a34a',
    primary: '#22c55e',
    secondary: '#4ade80',
    accent: '#86efac'
  },
  ocean: {
    name: 'Ocean',
    description: 'Cool blue monochrome',
    backgroundColor: '#f0f9ff',
    quickTileColor: '#0284c7',
    primary: '#0ea5e9',
    secondary: '#38bdf8',
    accent: '#7dd3fc'
  }
};

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
        themeName: 'default'
      };
    },
  });

  const [selectedTheme, setSelectedTheme] = useState('default');

  React.useEffect(() => {
    if (theme) {
      setSelectedTheme(theme.themeName || 'default');
    }
  }, [theme]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const themeData = {
        tenantId,
        themeName: selectedTheme
      };

      if (theme?.id) {
        await base44.entities.TenantTheme.update(theme.id, themeData);
      } else {
        await base44.entities.TenantTheme.create(themeData);
      }

      queryClient.invalidateQueries({ queryKey: ['tenantTheme'] });
      
      // Reload the page to apply theme changes
      window.location.reload();
      
      toast({
        title: "Theme Updated",
        description: "Your theme settings have been saved. The page will reload to apply changes.",
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
            Choose Your Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-6">
            Select a theme to personalize your workspace appearance.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(THEMES).map(([key, themeData]) => {
              const isSelected = selectedTheme === key;
              const isDark = key === 'dark';
              
              return (
                <button
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected 
                      ? 'border-blue-600 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg mb-1">{themeData.name}</h3>
                    <p className="text-xs text-gray-600">{themeData.description}</p>
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    <div 
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: themeData.backgroundColor }}
                      title="Background"
                    />
                    <div 
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: themeData.primary }}
                      title="Primary"
                    />
                    <div 
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: themeData.secondary }}
                      title="Secondary"
                    />
                    <div 
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: themeData.accent }}
                      title="Accent"
                    />
                  </div>
                  
                  <div 
                    className={`text-xs px-2 py-1 rounded ${
                      isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                    style={{ backgroundColor: themeData.backgroundColor }}
                  >
                    <span className={isDark ? 'text-white' : 'text-gray-700'}>
                      Preview background
                    </span>
                  </div>
                </button>
              );
            })}
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