import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, MessageCircle, X, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function DriverChat({ user, isOpen, onToggle }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['driverMessages', user?.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDriverMessages', {
        userId: user.id
      });
      return response.data.messages || [];
    },
    enabled: !!user && isOpen,
    refetchInterval: 5000,
  });

  const unreadCount = messages.filter(m => 
    !m.isRead && m.senderEmail !== user?.email
  ).length;

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      markMessagesAsRead();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async () => {
    const unreadMessages = messages.filter(m => 
      !m.isRead && m.senderEmail !== user?.email
    );
    
    if (unreadMessages.length > 0) {
      try {
        await base44.functions.invoke('markMessagesAsRead', {
          messageIds: unreadMessages.map(m => m.id),
          userId: user.id
        });
        queryClient.invalidateQueries({ queryKey: ['driverMessages'] });
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await base44.functions.invoke('sendDriverMessage', {
        content: message,
        senderName: user.full_name,
        senderEmail: user.email,
        senderRole: user.appRole,
        userId: user.id,
        truckId: user.truck
      });

      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['driverMessages'] });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-600 text-white h-6 w-6 flex items-center justify-center p-0">
            {unreadCount}
          </Badge>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-white hover:bg-blue-700 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">Dispatch Chat</h2>
            <p className="text-sm text-blue-100">Real-time messaging</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation with dispatch</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderEmail === user.email;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  {!isOwn && (
                    <p className="text-xs text-gray-600 mb-1 px-3">
                      {msg.senderName}
                      {msg.senderRole && ` (${msg.senderRole})`}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {format(new Date(msg.timestamp || msg.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}