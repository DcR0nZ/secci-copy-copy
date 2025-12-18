import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Phone, Mail, Copy, UserPlus, Filter, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PhonebookPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [visibilitySettings, setVisibilitySettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        if (!user.tenantId) {
          setLoading(false);
          return;
        }

        const [allUsers, allVisibility] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.UserVisibility.list()
        ]);

        // Internal users (same tenant)
        const internalUsers = allUsers.filter(u => u.tenantId === user.tenantId && u.email);

        // External users (opted in and visible to this tenant)
        const externalUsers = allUsers.filter(u => {
          if (!u.email || u.tenantId === user.tenantId) return false;
          
          const visibility = allVisibility.find(v => v.userId === u.id);
          if (!visibility || !visibility.isVisibleExternally) return false;

          return visibility.visibleToAllTenants || 
                 (visibility.allowedTenantIds && visibility.allowedTenantIds.includes(user.tenantId));
        });

        setUsers([...internalUsers, ...externalUsers]);
        setVisibilitySettings(allVisibility);
      } catch (error) {
        console.error('Failed to load phonebook:', error);
        toast({
          title: 'Error',
          description: 'Failed to load phonebook data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (user.display_name || user.full_name || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower) ||
        (user.phone || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Type filter
      const isInternal = user.tenantId === currentUser?.tenantId;
      if (filterType === 'internal' && !isInternal) return false;
      if (filterType === 'external' && isInternal) return false;
      if (filterType === 'has-phone' && !user.phone) return false;
      if (filterType === 'has-avatar' && !user.avatar_url) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = (a.display_name || a.full_name || a.email || '').toLowerCase();
        const nameB = (b.display_name || b.full_name || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'recent') {
        return new Date(b.created_date) - new Date(a.created_date);
      }
      return 0;
    });

    return filtered;
  }, [users, searchQuery, sortBy, filterType, currentUser]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`
    });
  };

  const getInitials = (user) => {
    const name = user.display_name || user.full_name || user.email || '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (user) => {
    return user.display_name || user.full_name || user.email?.split('@')[0] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser?.tenantId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No Company Selected</h2>
            <p className="text-gray-600 mb-4">Please select a company to view the phonebook.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Phonebook</h1>
          <p className="text-gray-600 mt-1">Company directory and contacts</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
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
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredAndSortedUsers.length} of {users.length} contacts
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {filteredAndSortedUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
              <p className="text-gray-600">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Your company phonebook is empty'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedUsers.map(user => {
              const isExternal = user.tenantId !== currentUser?.tenantId;
              
              return (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={getDisplayName(user)}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-700 font-semibold text-sm">
                              {getInitials(user)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {getDisplayName(user)}
                          </h3>
                          {isExternal && (
                            <Badge variant="outline" className="text-xs">External</Badge>
                          )}
                        </div>

                        {/* Email */}
                        {user.email && (
                          <div className="flex items-center gap-2 mt-2">
                            <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <a
                              href={`mailto:${user.email}`}
                              className="text-sm text-blue-600 hover:underline truncate"
                            >
                              {user.email}
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => handleCopy(user.email, 'Email')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {/* Phone */}
                        {user.phone && (
                          <div className="flex items-center gap-2 mt-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <a
                              href={`tel:${user.phone}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {user.phone}
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => handleCopy(user.phone, 'Phone')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {/* Role badge */}
                        {user.appRole && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {user.appRole}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}