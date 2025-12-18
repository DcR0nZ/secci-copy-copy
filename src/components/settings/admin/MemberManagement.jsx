import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Edit, Trash2, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function MemberManagement({ user }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, [user.tenantId]);

  const loadMembers = async () => {
    try {
      const allUsers = await base44.entities.User.filter({ tenantId: user.tenantId });
      setMembers(allUsers.filter(u => u.email));
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = (member) => {
    setSelectedMember(member);
    setNewRole(member.appRole || 'customer');
    setDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedMember) return;

    // Validation
    if (newRole === 'globalAdmin' && user.appRole !== 'globalAdmin') {
      toast({
        title: 'Permission Denied',
        description: 'Only Global Admins can assign the Global Admin role',
        variant: 'destructive'
      });
      return;
    }

    // Check if removing last admin
    if ((selectedMember.appRole === 'tenantAdmin' || selectedMember.role === 'admin') && newRole !== 'tenantAdmin') {
      const admins = members.filter(m => m.appRole === 'tenantAdmin' || m.role === 'admin');
      if (admins.length === 1) {
        toast({
          title: 'Cannot Change Role',
          description: 'Cannot remove the last admin. Promote another member first.',
          variant: 'destructive'
        });
        return;
      }
    }

    setSaving(true);
    try {
      await base44.entities.User.update(selectedMember.id, {
        appRole: newRole
      });

      await base44.entities.AuditLog.create({
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.display_name || user.full_name || user.email,
        action: 'role_changed',
        targetId: selectedMember.id,
        metadata: {
          memberName: selectedMember.display_name || selectedMember.full_name || selectedMember.email,
          oldRole: selectedMember.appRole,
          newRole
        }
      });

      toast({
        title: 'Role Updated',
        description: `${selectedMember.display_name || selectedMember.full_name || selectedMember.email}'s role has been changed to ${newRole}`
      });

      setDialogOpen(false);
      loadMembers();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update member role',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member) => {
    // Check if last admin
    if (member.appRole === 'tenantAdmin' || member.role === 'admin') {
      const admins = members.filter(m => m.appRole === 'tenantAdmin' || m.role === 'admin');
      if (admins.length === 1) {
        toast({
          title: 'Cannot Remove',
          description: 'Cannot remove the last admin. Promote another member first.',
          variant: 'destructive'
        });
        return;
      }
    }

    if (!confirm(`Remove ${member.display_name || member.full_name || member.email} from the company?`)) return;

    try {
      await base44.entities.User.update(member.id, {
        tenantId: null
      });

      await base44.entities.AuditLog.create({
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.display_name || user.full_name || user.email,
        action: 'member_removed',
        targetId: member.id,
        metadata: {
          memberName: member.display_name || member.full_name || member.email
        }
      });

      toast({
        title: 'Member Removed',
        description: `${member.display_name || member.full_name || member.email} has been removed from the company`
      });

      loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast({
        title: 'Remove Failed',
        description: 'Failed to remove member',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      globalAdmin: 'bg-red-100 text-red-800',
      tenantAdmin: 'bg-orange-100 text-orange-800',
      dispatcher: 'bg-purple-100 text-purple-800',
      driver: 'bg-green-100 text-green-800',
      manager: 'bg-yellow-100 text-yellow-800',
      customer: 'bg-blue-100 text-blue-800',
      outreach: 'bg-indigo-100 text-indigo-800',
      outreachOperator: 'bg-pink-100 text-pink-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getDisplayName = (member) => {
    return member.display_name || member.full_name || member.email?.split('@')[0] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {members.length} member{members.length !== 1 ? 's' : ''} in your company
          </p>
          <Button size="sm" variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        <div className="space-y-2">
          {members.map(member => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-semibold text-sm">
                        {getDisplayName(member).substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{getDisplayName(member)}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <p className="text-sm text-gray-600 truncate">{member.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Badge className={getRoleBadgeColor(member.appRole)}>
                      {member.appRole || 'customer'}
                    </Badge>
                    
                    {member.id !== user.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeRole(member)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">
                  {getDisplayName(selectedMember)}
                </p>
                <p className="text-sm text-gray-600">{selectedMember.email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-role">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="outreachOperator">Outreach Operator</SelectItem>
                    <SelectItem value="tenantAdmin">Tenant Admin</SelectItem>
                    {user.appRole === 'globalAdmin' && (
                      <SelectItem value="globalAdmin">Global Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {user.appRole !== 'globalAdmin' && 'Note: Only Global Admins can assign the Global Admin role'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}