import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  UserPlus,
  UserCog,
  Briefcase,
  Info,
  Send
} from 'lucide-react';
import moment from 'moment';
import AdminSendNotification from '../components/notifications/AdminSendNotification';

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      return base44.entities.Notification.filter({ userId: currentUser.id }, '-created_date');
    },
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job_status_update':
        return <Briefcase className="h-5 w-5 text-blue-600" />;
      case 'new_job':
        return <Briefcase className="h-5 w-5 text-green-600" />;
      case 'delivery_partner_invite':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      case 'role_change':
        return <UserCog className="h-5 w-5 text-orange-600" />;
      case 'admin_message':
        return <Send className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      await base44.entities.Notification.update(notificationId, {
        ...notification,
        isRead: true,
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(
        unreadNotifications.map(n =>
          base44.entities.Notification.update(n.id, { ...n, isRead: true })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "Success",
        description: "All notifications marked as read.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all as read.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await base44.entities.Notification.delete(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "Success",
        description: "Notification deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    // Navigate to related page if jobId exists
    if (notification.jobId) {
      navigate(createPageUrl('AdminJobs'));
    }
  };

  const renderNotification = (notification) => (
    <Card
      key={notification.id}
      className={`cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="mt-1">{getNotificationIcon(notification.type)}</div>
          <div className="flex-1 min-w-0">
            {notification.title && (
              <h4 className="font-semibold text-gray-900 mb-1">{notification.title}</h4>
            )}
            <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{moment(notification.created_date).fromNow()}</span>
              {!notification.isRead && (
                <Badge className="bg-blue-600">New</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(notification.id);
                }}
                title="Mark as read"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(notification.id);
              }}
              title="Delete"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.appRole === 'globalAdmin' || user?.appRole === 'tenantAdmin';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">Stay updated with important events and messages</p>
        </div>
        {unreadNotifications.length > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {isAdmin && <AdminSendNotification user={user} />}

      <Tabs defaultValue="unread" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unread">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-3 mt-6">
          {unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unread Notifications</h3>
                <p className="text-gray-600">You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            unreadNotifications.map(renderNotification)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-6">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
                <p className="text-gray-600">You don't have any notifications yet.</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map(renderNotification)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}