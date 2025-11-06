import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && user.appRole !== 'dispatcher')) {
            return Response.json({ error: 'Unauthorized - Dispatcher access required' }, { status: 403 });
        }

        const body = await req.json();
        const { proposalId, approved, rejectionReason } = body;

        if (!proposalId || approved === undefined) {
            return Response.json({ 
                error: 'Missing required fields: proposalId, approved' 
            }, { status: 400 });
        }

        // Fetch the proposal
        const proposal = await base44.asServiceRole.entities.RescheduleProposal.get(proposalId);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        if (proposal.status !== 'PENDING') {
            return Response.json({ error: 'Proposal already processed' }, { status: 400 });
        }

        if (!approved) {
            // Reject the proposal
            await base44.asServiceRole.entities.RescheduleProposal.update(proposalId, {
                status: 'REJECTED',
                reviewedBy: user.email,
                reviewedAt: new Date().toISOString(),
                rejectionReason: rejectionReason || 'No reason provided'
            });

            return Response.json({
                success: true,
                message: 'Proposal rejected'
            });
        }

        // Apply the approved changes
        for (const change of proposal.proposedChanges) {
            // Find the assignment for this job
            const assignments = await base44.asServiceRole.entities.Assignment.filter({
                jobId: change.jobId,
                date: proposal.date
            });

            if (assignments.length > 0) {
                const assignment = assignments[0];
                
                // Update the assignment with new time slot
                await base44.asServiceRole.entities.Assignment.update(assignment.id, {
                    timeSlotId: change.newTimeSlot,
                    slotPosition: change.newSlotPosition || 1
                });
            }
        }

        // Update proposal status
        await base44.asServiceRole.entities.RescheduleProposal.update(proposalId, {
            status: 'APPLIED',
            reviewedBy: user.email,
            reviewedAt: new Date().toISOString()
        });

        // Send confirmation emails to affected parties
        await base44.functions.invoke('sendRescheduleAppliedEmail', {
            proposalId: proposalId
        });

        return Response.json({
            success: true,
            message: 'Schedule changes have been applied successfully'
        });

    } catch (error) {
        console.error('Error applying reschedule:', error);
        return Response.json({ 
            error: error.message || 'Failed to apply reschedule proposal' 
        }, { status: 500 });
    }
});