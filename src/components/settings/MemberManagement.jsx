import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Driver' },
  { value: 'customer', label: 'Customer' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'manager', label: 'Manager' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'outreachOperator', label: 'Outreach Operator' },
  { value: 'tenantAdmin', label: 'Tenant Admin' }
];

export default function MemberManagement({ user }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({ email: '', role: 'customer' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isGlobalAdmin = user.appRole === 'globalAdmin' || user.role === 'admin';

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const allUsers = await base44.entities.User.list();
      const tenantMembers = allUsers.filter(u => u.tenantId === (user.tenantId || 'sec'));
      setMembers(tenantMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({ email: member.email, role: member.appRole || 'customer' });
    } else {
      setEditingMember(null);
      setFormData({ email: '', role: 'customer' });
    }
    setDialogOpen(true);
  };

  const handleChangeRole = async (member, newRole) => {
    // Prevent non-global-admins from assigning global admin
    if (newRole === 'globalAdmin' && !isGlobalAdmin) {
      toast({
        title: 'Permission denied',
        description: 'Only Global Admins can assign Global Admin role',
        variant: 'destructive'
      });
      return;
    }

    // Check if removing last tenant admin
    if (member.appRole === 'tenantAdmin' && newRole !== 'tenantAdmin') {
      const tenantAdmins = members.filter(m => m.appRole === 'tenantAdmin');
      if (tenantAdmins.length === 1) {
        toast({
          title: 'Cannot remove last admin',
          description: 'You must promote another member to Tenant Admin first',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      await base44.entities.User.update(member.id, { ...member, appRole: newRole });

      await base44.entities.AuditLog.create({
        tenantId: user.tenantId || 'sec',
        actorUserId: user.id,
        actorName: user.full_name || user.email,
        action: 'changed_role',
        targetId: member.id,
        targetName: member.full_name || member.email,
        metadata: { oldRole: member.appRole, newRole }
      });

      toast({ title: 'Role updated', description: 'Member role has been changed' });
      fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update member role',
        variant: 'destructive'
      });
    }
  };

  const handleInvite = async () => {
    if (!formData.email) {
      toast({
        title: 'Validation error',
        description: 'Email is required',
        variant: 'destructive'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Validation error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // For now, just show a message since actual invitation requires Base44 dashboard
      toast({
        title: 'Invitation process',
        description: 'Please use the Base44 dashboard to invite new users. Once they accept, you can assign their role here.',
        variant: 'default'
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Invite failed',
        description: 'Failed to send invitation',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (member) => {
    // Check if removing last tenant admin
    if (member.appRole === 'tenantAdmin') {
      const tenantAdmins = members.filter(m => m.appRole === 'tenantAdmin');
      if (tenantAdmins.length === 1) {
        toast({
          title: 'Cannot remove last admin',
          description: 'You must promote another member to Tenant Admin first',
          variant: 'destructive'
        });
        return;
      }
    }

    if (!confirm(`Are you sure you want to remove ${member.full_name || member.email} from this tenant?`)) return;

    try {
      // Set tenantId to null to remove from tenant
      await base44.entities.User.update(member.id, { ...member, tenantId: null });

      await base44.entities.AuditLog.create({
        tenantId: user.tenantId || 'sec',
        actorUserId: user.id,
        actorName: user.full_name || user.email,
        action: 'removed_member',
        targetId: member.id,
        targetName: member.full_name || member.email
      });

      toast({ title: 'Member removed', description: 'Member has been removed from tenant' });
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Remove failed',
        description: 'Failed to remove member',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const availableRoles = isGlobalAdmin 
    ? [...ROLE_OPTIONS, { value: 'globalAdmin', label: 'Global Admin' }]
    : ROLE_OPTIONS;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Member Management</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No members in this tenant</p>
          ) : (
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{member.full_name || member.displayName || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={member.appRole || 'customer'}
                      onValueChange={(value) => handleChangeRole(member, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRemove(member)}
                      disabled={member.id === user.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Initial Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                Note: User invitations must be sent through the Base44 dashboard. Once they accept, you can manage their role here.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={saving}>
              {saving ? 'Sending...' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}