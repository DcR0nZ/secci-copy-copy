
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Maximize2, Minimize2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    init();
  }, []);

  useEffect(() => {
    // Fetch messages only when chat is opened - no automatic polling
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  const fetchMessages = async () => {
    try {
      const allMessages = await base44.entities.Message.list();
      const sortedMessages = allMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedMessages);

      // Calculate unread count (messages from last 5 minutes not sent by current user)
      if (!isOpen && currentUser) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const unread = sortedMessages.filter(m => 
          new Date(m.timestamp) > fiveMinutesAgo && 
          m.senderEmail !== currentUser.email
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setSending(true);
    try {
      await base44.entities.Message.create({
        content: newMessage,
        senderName: currentUser.full_name || currentUser.email,
        senderEmail: currentUser.email,
        senderRole: currentUser.appRole || 'user',
        timestamp: new Date().toISOString()
      });

      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      dispatcher: 'bg-purple-100 text-purple-800',
      driver: 'bg-green-100 text-green-800',
      customer: 'bg-blue-100 text-blue-800',
      manager: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={toggleOpen}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 relative"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card 
          className={`fixed z-50 shadow-2xl transition-all ${
            isExpanded 
              ? 'inset-4 md:inset-10' 
              : 'bottom-6 right-6 w-96 h-[500px] max-w-[calc(100vw-3rem)]'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Team Chat
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-blue-700 h-8 w-8"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleOpen}
                className="text-white hover:bg-blue-700 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 flex flex-col h-[calc(100%-60px)]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Start a conversation with your team</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.senderEmail === currentUser.email;
                    return (
                      <div
                        key={index}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {!isOwnMessage && (
                              <>
                                <span className="text-sm font-medium text-gray-900">
                                  {message.senderName}
                                </span>
                                {message.senderRole && (
                                  <Badge className={`text-xs ${getRoleBadgeColor(message.senderRole)}`}>
                                    {message.senderRole}
                                  </Badge>
                                )}
                              </>
                            )}
                            {isOwnMessage && (
                              <span className="text-xs text-gray-500">You</span>
                            )}
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(message.timestamp), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Communicate with dispatch, drivers, and team members in real-time
              </p>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
