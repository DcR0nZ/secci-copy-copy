import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DangerZoneSection({ user }) {
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [finalConfirmDialog, setFinalConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const getTenantName = () => {
    const tenantNames = {
      'sec': 'South East Carters',
      'bayside_plasterboard': 'Bayside Plasterboard',
      'outreach_hire': 'Outreach Hire'
    };
    return tenantNames[user.tenantId] || user.tenantId || 'Unknown';
  };

  const handleFirstConfirm = async () => {
    // Check if user is last tenant admin
    if (user.appRole === 'tenantAdmin' || user.appRole === 'globalAdmin') {
      try {
        const allUsers = await base44.entities.User.list();
        const tenantAdmins = allUsers.filter(u => 
          u.tenantId === user.tenantId && 
          (u.appRole === 'tenantAdmin' || u.appRole === 'globalAdmin')
        );

        if (tenantAdmins.length === 1) {
          toast({
            title: 'Cannot leave company',
            description: 'You are the last admin. Please promote another member to Tenant Admin before leaving.',
            variant: 'destructive'
          });
          setConfirmDialog(false);
          return;
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    }

    setConfirmDialog(false);
    setFinalConfirmDialog(true);
  };

  const handleFinalConfirm = async () => {
    const tenantName = getTenantName();
    
    if (confirmText !== tenantName) {
      toast({
        title: 'Confirmation failed',
        description: `Please type "${tenantName}" exactly to confirm`,
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    try {
      // Log the action
      await base44.entities.AuditLog.create({
        tenantId: user.tenantId || 'sec',
        actorUserId: user.id,
        actorName: user.full_name || user.email,
        action: 'left_tenant',
        targetId: user.id,
        targetName: user.full_name || user.email
      });

      // Remove user from tenant
      await base44.auth.updateMe({ tenantId: null });

      toast({
        title: 'Left company',
        description: 'You have been removed from the company'
      });

      // Redirect to login or tenant selector
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error leaving company:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave company. Please try again.',
        variant: 'destructive'
      });
      setProcessing(false);
    }
  };

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Leave Company</h3>
            <p className="text-sm text-red-800 mb-4">
              Permanently remove yourself from {getTenantName()}. This action cannot be undone.
            </p>
            <ul className="text-sm text-red-800 space-y-1 mb-4 list-disc list-inside">
              <li>You will lose access to all jobs and data</li>
              <li>Your assigned tasks will be unassigned</li>
              <li>You cannot rejoin without a new invitation</li>
            </ul>
            <Button
              variant="destructive"
              onClick={() => setConfirmDialog(true)}
            >
              Leave {getTenantName()}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove you from <strong>{getTenantName()}</strong>. You will lose access to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All jobs and scheduling data</li>
                <li>Team member contacts</li>
                <li>Company resources</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFirstConfirm}>
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={finalConfirmDialog} onOpenChange={setFinalConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              To confirm, please type <strong>{getTenantName()}</strong> below:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirm-text">Company Name</Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={getTenantName()}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setFinalConfirmDialog(false);
                setConfirmText('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleFinalConfirm}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Leave Company'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}