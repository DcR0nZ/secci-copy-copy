import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DangerZone({ user }) {
  const [showConfirm1, setShowConfirm1] = useState(false);
  const [showConfirm2, setShowConfirm2] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const { toast } = useToast();

  const handleLeaveClick = async () => {
    // Check if user is the last tenant admin
    try {
      const allUsers = await base44.entities.User.filter({ tenantId: user.tenantId });
      const admins = allUsers.filter(u => u.appRole === 'tenantAdmin' || u.role === 'admin');
      
      if (admins.length === 1 && (user.appRole === 'tenantAdmin' || user.role === 'admin')) {
        toast({
          title: 'Cannot Leave',
          description: 'You are the last admin. Please promote another member to admin first.',
          variant: 'destructive'
        });
        return;
      }

      // Get tenant name
      const tenants = await base44.entities.Tenant.filter({ tenantId: user.tenantId });
      if (tenants.length > 0) {
        setTenantName(tenants[0].name);
      }

      setShowConfirm1(true);
    } catch (error) {
      console.error('Failed to check admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify admin status',
        variant: 'destructive'
      });
    }
  };

  const handleConfirm1 = () => {
    setShowConfirm1(false);
    setShowConfirm2(true);
  };

  const handleLeave = async () => {
    if (confirmText !== tenantName) {
      toast({
        title: 'Confirmation Failed',
        description: `Please type "${tenantName}" exactly to confirm`,
        variant: 'destructive'
      });
      return;
    }

    setLeaving(true);
    try {
      // Update user to remove tenant association
      await base44.auth.updateMe({
        tenantId: null
      });

      toast({
        title: 'Left Company',
        description: 'You have successfully left the company'
      });

      // Redirect to home/dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Failed to leave company:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave company',
        variant: 'destructive'
      });
      setLeaving(false);
    }
  };

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="text-lg font-semibold text-red-900">Leave Company</h3>
              <p className="text-sm text-red-800">
                Once you leave this company, you will lose access to all jobs, data, and settings 
                associated with it. This action cannot be undone.
              </p>
              
              <div className="bg-white rounded-lg p-4 space-y-2 mt-4">
                <p className="text-sm font-medium text-gray-900">What happens when you leave:</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>You will no longer have access to company data</li>
                  <li>Your profile will be removed from the company phonebook</li>
                  <li>Any assigned jobs or deliveries will be unassigned</li>
                  <li>You can be re-invited by an admin if needed</li>
                </ul>
              </div>

              <div className="pt-4">
                <Button
                  variant="destructive"
                  onClick={handleLeaveClick}
                  disabled={leaving}
                >
                  {leaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Leave Company
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Confirmation Dialog */}
      <AlertDialog open={showConfirm1} onOpenChange={setShowConfirm1}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave <strong>{tenantName}</strong>. This will remove your access 
              to all company data and cannot be undone without an invitation from an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm1} className="bg-red-600 hover:bg-red-700">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second Confirmation Dialog */}
      <AlertDialog open={showConfirm2} onOpenChange={setShowConfirm2}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              To confirm leaving, please type the exact company name below:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-text">Type: <strong>{tenantName}</strong></Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tenantName}
              autoFocus
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmText('');
              setShowConfirm2(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={confirmText !== tenantName || leaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {leaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                'Leave Company'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}