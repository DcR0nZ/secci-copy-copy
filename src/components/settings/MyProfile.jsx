import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function MyProfile({ user }) {
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    phone: '',
    avatar_url: ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.match(/image\/(jpg|jpeg|png|webp)/)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a JPG, PNG, or WebP image',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be under 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('avatar_url', file_url);
      toast({
        title: 'Avatar Uploaded',
        description: 'Your avatar has been updated'
      });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload avatar',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (formData.display_name.trim().length < 2) {
      toast({
        title: 'Validation Error',
        description: 'Display name must be at least 2 characters',
        variant: 'destructive'
      });
      return;
    }

    if (formData.display_name.length > 50) {
      toast({
        title: 'Validation Error',
        description: 'Display name must be less than 50 characters',
        variant: 'destructive'
      });
      return;
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: formData.display_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        avatar_url: formData.avatar_url
      });

      setHasChanges(false);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully'
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save profile changes',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const name = formData.display_name || user?.full_name || user?.email || '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-700 font-semibold text-2xl">
                  {getInitials()}
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('avatar-upload').click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Change Avatar'}
            </Button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WebP. Max 5MB.</p>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name *</Label>
          <Input
            id="display_name"
            value={formData.display_name}
            onChange={(e) => handleChange('display_name', e.target.value)}
            placeholder="Your display name"
            maxLength={50}
          />
          <p className="text-xs text-gray-500">
            {formData.display_name.length}/50 characters
          </p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Contact Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="your.email@example.com"
          />
          <p className="text-xs text-gray-500">
            This email will be visible in the phonebook
          </p>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+61 400 000 000"
          />
          <p className="text-xs text-gray-500">
            Include country code for best results
          </p>
        </div>

        {/* Save Button */}
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