import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function NotificationBell({ user }) {
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => base44.entities.Notification.filter({ userId: user.id }),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => navigate(createPageUrl('Notifications'))}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 hover:bg-red-600">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}