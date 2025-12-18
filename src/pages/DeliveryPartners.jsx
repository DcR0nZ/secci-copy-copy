import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Check,
  X,
  Send,
  Clock,
  UserPlus,
  Building2
} from 'lucide-react';

export default function DeliveryPartnersPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inputTenantId, setInputTenantId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [tenantIdError, setTenantIdError] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list(),
    enabled: !!user,
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['deliveryPartnerInvites'],
    queryFn: () => base44.entities.DeliveryPartnerInvite.list(),
    enabled: !!user,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.appRole !== 'tenantAdmin' && currentUser.role !== 'admin') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const myTenantId = user?.tenantId || 'sec';

  // Filter invites
  const sentInvites = invites.filter(i => i.fromTenantId === myTenantId);
  const receivedInvites = invites.filter(i => i.toTenantId === myTenantId);
  const activePartners = invites.filter(
    i => i.status === 'accepted' && (i.fromTenantId === myTenantId || i.toTenantId === myTenantId)
  );

  // Get available tenants to invite
  const existingPartnerTenantIds = new Set([
    ...invites.filter(i => i.fromTenantId === myTenantId).map(i => i.toTenantId),
    ...invites.filter(i => i.toTenantId === myTenantId).map(i => i.fromTenantId)
  ]);
  const availableTenantsToInvite = tenants.filter(
    t => t.tenantId !== myTenantId && !existingPartnerTenantIds.has(t.tenantId)
  );

  const handleSendInvite = async () => {
    setTenantIdError('');
    
    if (!inputTenantId.trim()) {
      setTenantIdError("Please enter a tenant ID.");
      return;
    }

    // Check if trying to invite self
    if (inputTenantId.trim() === myTenantId) {
      setTenantIdError("You cannot invite your own tenant.");
      return;
    }

    // Check if tenant exists
    const targetTenant = tenants.find(t => t.tenantId === inputTenantId.trim());
    if (!targetTenant) {
      setTenantIdError("Tenant ID not found. Please check and try again.");
      return;
    }

    // Check if already has a relationship with this tenant
    const existingInvite = invites.find(
      i => (i.fromTenantId === myTenantId && i.toTenantId === inputTenantId.trim()) ||
           (i.toTenantId === myTenantId && i.fromTenantId === inputTenantId.trim())
    );
    
    if (existingInvite) {
      setTenantIdError(`You already have a ${existingInvite.status} invite with this tenant.`);
      return;
    }

    setSending(true);
    try {
      const myTenant = tenants.find(t => t.tenantId === myTenantId);

      await base44.entities.DeliveryPartnerInvite.create({
        fromTenantId: myTenantId,
        fromTenantName: myTenant?.name || myTenantId,
        toTenantId: targetTenant.tenantId,
        toTenantName: targetTenant.name,
        status: 'pending',
        invitedBy: user.email,
        invitedByName: user.full_name,
        message: inviteMessage || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['deliveryPartnerInvites'] });

      toast({
        title: "Invite Sent",
        description: `Partnership invite sent to ${targetTenant.name}.`,
      });

      setInviteDialogOpen(false);
      setInputTenantId('');
      setInviteMessage('');
      setTenantIdError('');
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast({
        title: "Error",
        description: "Failed to send invite. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleRespondToInvite = async (inviteId, status) => {
    try {
      const invite = invites.find(i => i.id === inviteId);
      await base44.entities.DeliveryPartnerInvite.update(inviteId, {
        ...invite,
        status,
        respondedBy: user.email,
        respondedByName: user.full_name,
        respondedDate: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['deliveryPartnerInvites'] });

      toast({
        title: status === 'accepted' ? "Invite Accepted" : "Invite Declined",
        description: status === 'accepted' 
          ? "You are now delivery partners." 
          : "The invite has been declined.",
      });
    } catch (error) {
      console.error('Failed to respond to invite:', error);
      toast({
        title: "Error",
        description: "Failed to respond to invite. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelInvite = async (inviteId) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;

    try {
      await base44.entities.DeliveryPartnerInvite.delete(inviteId);
      queryClient.invalidateQueries({ queryKey: ['deliveryPartnerInvites'] });

      toast({
        title: "Invite Cancelled",
        description: "The invite has been cancelled.",
      });
    } catch (error) {
      console.error('Failed to cancel invite:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invite. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePartner = async (inviteId) => {
    if (!confirm('Are you sure you want to remove this delivery partner? This will end the partnership.')) return;

    try {
      await base44.entities.DeliveryPartnerInvite.delete(inviteId);
      queryClient.invalidateQueries({ queryKey: ['deliveryPartnerInvites'] });

      toast({
        title: "Partner Removed",
        description: "The delivery partnership has been ended.",
      });
    } catch (error) {
      console.error('Failed to remove partner:', error);
      toast({
        title: "Error",
        description: "Failed to remove partner. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Partners</h1>
          <p className="text-gray-600 mt-1">Manage cross-tenant collaboration and partnerships</p>
        </div>
        <Button
          onClick={() => setInviteDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Partner
        </Button>
      </div>

      <Tabs defaultValue="partners" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="partners">
            Active Partners ({activePartners.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Received ({receivedInvites.filter(i => i.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentInvites.filter(i => i.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-4 mt-6">
          {activePartners.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Partners</h3>
                <p className="text-gray-600 mb-4">
                  You don't have any active delivery partners yet. Invite other tenants to collaborate.
                </p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Partner
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activePartners.map((partner) => {
                const partnerTenantId = partner.fromTenantId === myTenantId 
                  ? partner.toTenantId 
                  : partner.fromTenantId;
                const partnerTenantName = partner.fromTenantId === myTenantId 
                  ? partner.toTenantName 
                  : partner.fromTenantName;
                
                return (
                  <Card key={partner.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{partnerTenantName}</h3>
                            <p className="text-sm text-gray-600">ID: {partnerTenantId}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-green-100 text-green-800">
                                <Check className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Since {new Date(partner.respondedDate || partner.created_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemovePartner(partner.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Partner
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4 mt-6">
          {receivedInvites.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Send className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Received Invites</h3>
                <p className="text-gray-600">
                  You haven't received any partnership invites yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {receivedInvites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{invite.fromTenantName}</h3>
                          <p className="text-sm text-gray-600">wants to partner with you</p>
                          {invite.message && (
                            <p className="text-sm text-gray-700 mt-2 italic">"{invite.message}"</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={
                              invite.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {invite.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {invite.status === 'accepted' && <Check className="h-3 w-3 mr-1" />}
                              {invite.status === 'declined' && <X className="h-3 w-3 mr-1" />}
                              {invite.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Sent by {invite.invitedByName}
                            </span>
                          </div>
                        </div>
                      </div>
                      {invite.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleRespondToInvite(invite.id, 'accepted')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleRespondToInvite(invite.id, 'declined')}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sentInvites.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Send className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sent Invites</h3>
                <p className="text-gray-600 mb-4">
                  You haven't sent any partnership invites yet.
                </p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Partner
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sentInvites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{invite.toTenantName}</h3>
                          <p className="text-sm text-gray-600">Invite sent</p>
                          {invite.message && (
                            <p className="text-sm text-gray-700 mt-2 italic">"{invite.message}"</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={
                              invite.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {invite.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {invite.status === 'accepted' && <Check className="h-3 w-3 mr-1" />}
                              {invite.status === 'declined' && <X className="h-3 w-3 mr-1" />}
                              {invite.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(invite.created_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {invite.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Delivery Partner</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tenant ID</label>
              <Input
                value={inputTenantId}
                onChange={(e) => {
                  setInputTenantId(e.target.value);
                  setTenantIdError('');
                }}
                placeholder="Enter tenant ID (e.g., bayside_plasterboard)"
                className={tenantIdError ? 'border-red-500' : ''}
              />
              {tenantIdError && (
                <p className="text-sm text-red-600 mt-1">{tenantIdError}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Enter the exact tenant ID of the organization you want to partner with.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message (Optional)</label>
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a message to your invite..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInviteDialogOpen(false);
                setInputTenantId('');
                setInviteMessage('');
                setTenantIdError('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}