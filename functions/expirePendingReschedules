import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Find all expired pending reschedules
        const now = new Date().toISOString();
        const expiredReschedules = await base44.asServiceRole.entities.PendingReschedule.filter({
            status: 'PENDING',
            expiresAt: { $lt: now }
        });

        if (expiredReschedules.length === 0) {
            return Response.json({ 
                message: 'No expired reschedules found',
                count: 0
            });
        }

        // Process each expired reschedule
        const results = await Promise.all(
            expiredReschedules.map(async (reschedule) => {
                try {
                    // Update reschedule status to expired
                    await base44.asServiceRole.entities.PendingReschedule.update(reschedule.id, {
                        status: 'EXPIRED',
                        reviewedAt: new Date().toISOString()
                    });

                    // Update job status back to SCHEDULED (keeping original schedule)
                    await base44.asServiceRole.entities.Job.update(reschedule.jobId, {
                        status: 'SCHEDULED'
                    });

                    // Notify requester that their request expired
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        from_name: 'SEC Delivery Portal',
                        to: reschedule.requestedBy,
                        subject: '⏰ Reschedule Request Expired',
                        body: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: #dc2626; padding: 30px; text-align: center;">
                                    <h1 style="color: white; margin: 0;">Reschedule Request Expired</h1>
                                </div>
                                
                                <div style="padding: 30px; background: white;">
                                    <p>Your reschedule request for <strong>${reschedule.jobSummary?.customerName || 'a job'}</strong> has expired without confirmation.</p>
                                    
                                    <div style="background: #fef2f2; padding: 15px; margin: 20px 0; border-left: 4px solid #dc2626;">
                                        <p style="margin: 0; color: #991b1b;">
                                            <strong>Original Schedule Maintained</strong><br/>
                                            The job remains scheduled at its original time and location.
                                        </p>
                                    </div>
                                    
                                    <p>If you still need to reschedule this job, please submit a new reschedule request.</p>
                                    
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="https://sec-delivery-portal.base44.app/SchedulingBoard" 
                                           style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                                            Open Scheduling Board
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `
                    });

                    return { id: reschedule.id, success: true };
                } catch (error) {
                    console.error(`Failed to expire reschedule ${reschedule.id}:`, error);
                    return { id: reschedule.id, success: false, error: error.message };
                }
            })
        );

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return Response.json({ 
            message: `Processed ${expiredReschedules.length} expired reschedules`,
            successCount,
            failureCount,
            results
        });

    } catch (error) {
        console.error('Error expiring pending reschedules:', error);
        return Response.json({ 
            error: error.message || 'Failed to expire pending reschedules' 
        }, { status: 500 });
    }
});