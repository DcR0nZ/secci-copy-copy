import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Phone, Mail, Copy, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PhonebookPage() {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [visibilitySettings, setVisibilitySettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        const [allUsersList, visibilityList] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.UserVisibility.list()
        ]);

        setAllUsers(allUsersList);
        setVisibilitySettings(visibilityList);

        // Get users from current tenant
        const internalUsers = allUsersList.filter(u => 
          u.tenantId === (user.tenantId || 'sec') && u.email
        );

        // Get external users who opted in
        const externalUsers = allUsersList.filter(u => {
          if (!u.email || u.tenantId === (user.tenantId || 'sec')) return false;
          
          const visibility = visibilityList.find(v => v.userId === u.id);
          if (!visibility || !visibility.isVisibleExternally) return false;
          
          if (visibility.visibleToAllTenants) return true;
          
          return visibility.allowedTenantIds?.includes(user.tenantId || 'sec');
        });

        setUsers([...internalUsers, ...externalUsers]);
      } catch (error) {
        console.error('Error loading phonebook:', error);
        toast({
          title: 'Error',
          description: 'Failed to load phonebook',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [toast]);

  const getInitials = (user) => {
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const getDisplayName = (user) => {
    return user.displayName || user.full_name || user.email?.split('@')[0] || 'Unknown';
  };

  const isExternal = (user) => {
    return user.tenantId !== (currentUser?.tenantId || 'sec');
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`
    });
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        getDisplayName(user).toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Type filter
      if (filterBy === 'internal' && isExternal(user)) return false;
      if (filterBy === 'external' && !isExternal(user)) return false;
      if (filterBy === 'has-phone' && !user.phone) return false;
      if (filterBy === 'has-avatar' && !user.avatarUrl) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return getDisplayName(a).localeCompare(getDisplayName(b));
      }
      if (sortBy === 'recent') {
        return new Date(b.created_date) - new Date(a.created_date);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser?.tenantId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Please select a company to view the phonebook</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Phonebook</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Directory of team members and contacts</p>
          </div>
          {(currentUser?.appRole === 'tenantAdmin' || currentUser?.appRole === 'globalAdmin') && (
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      <Card className="flex-shrink-0 mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="internal">Internal Only</SelectItem>
                <SelectItem value="external">External Only</SelectItem>
                <SelectItem value="has-phone">Has Phone</SelectItem>
                <SelectItem value="has-avatar">Has Avatar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No members found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedUsers.map(user => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl} alt={getDisplayName(user)} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {getDisplayName(user)}
                        </h3>
                        {isExternal(user) && (
                          <Badge variant="outline" className="text-xs">External</Badge>
                        )}
                      </div>
                      
                      {user.email && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <a href={`mailto:${user.email}`} className="hover:text-blue-600 truncate flex-1">
                            {user.email}
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => copyToClipboard(user.email, 'Email')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {user.phone && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <a href={`tel:${user.phone}`} className="hover:text-blue-600 flex-1">
                            {user.phone}
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => copyToClipboard(user.phone, 'Phone')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}