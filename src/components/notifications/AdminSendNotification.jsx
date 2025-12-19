import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Send, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminSendNotification({ user }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetRole, setTargetRole] = useState('');
  const [targetTenant, setTargetTenant] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.asServiceRole.entities.User.list(),
    enabled: isExpanded,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list(),
    enabled: isExpanded,
  });

  const handleSend = async () => {
    if (!title || !message) {
      toast({
        title: "Error",
        description: "Please fill in both title and message.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      let targetUsers = [];

      switch (targetType) {
        case 'all':
          targetUsers = allUsers;
          break;
        case 'role':
          if (!targetRole) {
            toast({
              title: "Error",
              description: "Please select a role.",
              variant: "destructive",
            });
            setSending(false);
            return;
          }
          targetUsers = allUsers.filter(u => u.appRole === targetRole || u.role === targetRole);
          break;
        case 'tenant':
          if (!targetTenant) {
            toast({
              title: "Error",
              description: "Please select a tenant.",
              variant: "destructive",
            });
            setSending(false);
            return;
          }
          targetUsers = allUsers.filter(u => u.tenantId === targetTenant);
          break;
      }

      const notifications = targetUsers.map(targetUser => ({
        userId: targetUser.id,
        title,
        message,
        type: 'admin_message',
        isRead: false,
      }));

      await Promise.all(
        notifications.map(n => base44.asServiceRole.entities.Notification.create(n))
      );

      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      toast({
        title: "Success",
        description: `Notification sent to ${notifications.length} user(s).`,
      });

      setTitle('');
      setMessage('');
      setTargetType('all');
      setTargetRole('');
      setTargetTenant('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Notification to Users
          </CardTitle>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="target">Target Audience</Label>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger>
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="role">Specific Role</SelectItem>
                <SelectItem value="tenant">Specific Tenant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'role' && (
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="tenantAdmin">Tenant Admin</SelectItem>
                  <SelectItem value="globalAdmin">Global Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {targetType === 'tenant' && (
            <div className="grid gap-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={targetTenant} onValueChange={setTargetTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.tenantId}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={4}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}