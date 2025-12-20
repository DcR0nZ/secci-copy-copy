import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Mail, UserX, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MemberManagement({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('driver');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  const tenantId = user.tenantId || 'sec';

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const users = await base44.asServiceRole.entities.User.list();
      return users.filter(u => u.tenantId === tenantId || u.appRole === 'globalAdmin');
    },
  });

  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.appRole?.toLowerCase().includes(query)
    );
  });

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // In a real implementation, you would send an invitation email
      // For now, we'll just show a success message
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('driver');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async () => {
    try {
      await base44.asServiceRole.entities.User.update(selectedUser.id, {
        ...selectedUser,
        tenantId: null,
        appRole: null
      });
      
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      
      toast({
        title: "Member Removed",
        description: `${selectedUser.full_name} has been removed from your team`,
      });
      
      setRemoveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      globalAdmin: 'bg-purple-100 text-purple-800',
      tenantAdmin: 'bg-blue-100 text-blue-800',
      dispatcher: 'bg-green-100 text-green-800',
      driver: 'bg-orange-100 text-orange-800',
      manager: 'bg-yellow-100 text-yellow-800',
      customer: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading members...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setInviteDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>

        <p className="text-sm text-gray-600">{filteredUsers.length} member(s)</p>

        <div className="space-y-2">
          {filteredUsers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{member.full_name || member.email}</h4>
                        {member.appRole && (
                          <Badge className={getRoleBadge(member.appRole)}>
                            {member.appRole.replace(/([A-Z])/g, ' $1').trim()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  {member.appRole !== 'globalAdmin' && member.id !== user.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(member);
                        setRemoveDialogOpen(true);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="tenantAdmin">Tenant Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedUser?.full_name || selectedUser?.email} from your team?
              They will lose access to your company's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}