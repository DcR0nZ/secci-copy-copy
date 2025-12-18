import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import UserCard from '../components/users/UserCard';
import UserDetailsModal from '../components/users/UserDetailsModal';

const ROLE_GROUPS = [
  { id: 'globalAdmin', label: 'Global Admins', color: 'bg-red-100' },
  { id: 'dispatcher', label: 'Dispatchers', color: 'bg-purple-100' },
  { id: 'driver', label: 'Drivers', color: 'bg-green-100' },
  { id: 'customer', label: 'Customers', color: 'bg-blue-100' },
  { id: 'manager', label: 'Managers', color: 'bg-yellow-100' },
  { id: 'outreachOperator', label: 'Outreach Operators', color: 'bg-pink-100' },
  { id: 'outreach', label: 'Outreach', color: 'bg-indigo-100' }
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserDialogOpen, setUserDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allUsers, allCustomers] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Customer.list()
      ]);
      setUsers(allUsers.filter(u => u.email));
      setCustomers(allCustomers);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users and customers.",
        variant: "destructive",
      });
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUserUpdate = async (userId, updateData) => {
    try {
      await base44.entities.User.update(userId, updateData);

      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId 
            ? { ...u, ...updateData }
            : u
        )
      );

      toast({
        title: "User Updated",
        description: "User information has been successfully updated.",
      });
      
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
      console.error("Failed to update user:", error);
    }
  };

  const handleUserDelete = async (userId) => {
    try {
      await base44.entities.User.delete(userId);

      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));

      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
      console.error("Failed to delete user:", error);
    }
  };

  const getUsersForRole = (roleId) => {
    return users.filter(u => (u.appRole || 'customer') === roleId);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const openDashboard = () => {
    window.open('https://base44.app/dashboard', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Header - Sticky */}
        <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">System Users</h1>
            <Button size="sm" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
          <p className="text-sm text-gray-600">Manage user accounts and roles</p>
        </div>

        {/* Scrollable Content */}
        <div className="px-4 py-4 pb-24">
          <div className="space-y-4">
            {ROLE_GROUPS.map((roleGroup) => {
              const roleUsers = getUsersForRole(roleGroup.id);
              
              return (
                <Card key={roleGroup.id} className={`${roleGroup.color} border-2`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <span>{roleGroup.label}</span>
                      </span>
                      <Badge variant="secondary" className="bg-white">
                        {roleUsers.length} {roleUsers.length === 1 ? 'user' : 'users'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" style={{ touchAction: 'pan-y' }}>
                      {roleUsers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No users in this role</p>
                      ) : (
                        roleUsers.map((user) => {
                          const customer = customers.find(c => c.id === user.customerId);
                          return (
                            <UserCard
                              key={user.id}
                              user={user}
                              customer={customer}
                              onClick={() => handleUserClick(user)}
                            />
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <UserDetailsModal
          user={selectedUser}
          customer={customers.find(c => c.id === selectedUser?.customerId)}
          customers={customers}
          open={isUserDialogOpen}
          onOpenChange={setUserDialogOpen}
          onUpdate={handleUserUpdate}
          onDelete={handleUserDelete}
        />

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                To invite a new user to the platform, you'll need to use the Base44 dashboard.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-blue-900 font-medium">How to invite users:</p>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Open the Base44 Dashboard</li>
                  <li>Go to Settings → Team & Access</li>
                  <li>Click "Invite User" and enter their email</li>
                  <li>Once they accept, they'll appear in this list</li>
                  <li>You can then link them to a customer and set their app role</li>
                </ol>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={openDashboard}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">System Users</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage user accounts, roles, and permissions</p>
          </div>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch" style={{ touchAction: 'pan-y' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {ROLE_GROUPS.map((roleGroup) => {
            const roleUsers = getUsersForRole(roleGroup.id);
            
            return (
              <Card key={roleGroup.id} className={`${roleGroup.color} border-2`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      <span>{roleGroup.label}</span>
                    </span>
                    <Badge variant="secondary" className="bg-white">
                      {roleUsers.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roleUsers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No users in this role</p>
                    ) : (
                      roleUsers.map((user) => {
                        const customer = customers.find(c => c.id === user.customerId);
                        return (
                          <UserCard
                            key={user.id}
                            user={user}
                            customer={customer}
                            onClick={() => handleUserClick(user)}
                          />
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <UserDetailsModal
        user={selectedUser}
        customer={customers.find(c => c.id === selectedUser?.customerId)}
        customers={customers}
        open={isUserDialogOpen}
        onOpenChange={setUserDialogOpen}
        onUpdate={handleUserUpdate}
        onDelete={handleUserDelete}
      />

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              To invite a new user to the platform, you'll need to use the Base44 dashboard.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-blue-900 font-medium">How to invite users:</p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Open the Base44 Dashboard</li>
                <li>Go to Settings → Team & Access</li>
                <li>Click "Invite User" and enter their email</li>
                <li>Once they accept, they'll appear in this list</li>
                <li>You can then link them to a customer and set their app role</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={openDashboard}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}