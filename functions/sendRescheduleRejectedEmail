
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { pendingRescheduleId } = body;

        if (!pendingRescheduleId) {
            return Response.json({ error: 'Missing pendingRescheduleId' }, { status: 400 });
        }

        const reschedule = await base44.asServiceRole.entities.PendingReschedule.get(pendingRescheduleId);
        if (!reschedule) {
            return Response.json({ error: 'Reschedule request not found' }, { status: 404 });
        }

        // Notify the original requester
        const recipientEmail = reschedule.requestedBy;

        const formatTimeSlot = (slotId) => {
            const slots = {
                'first-am': 'First AM (6-9am)',
                'second-am': 'Second AM (9am-12pm)',
                'lunch': 'Lunch (12-3pm)',
                'afternoon': 'Afternoon (3-6pm)'
            };
            return slots[slotId] || slotId;
        };

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                    .schedule-box { margin: 15px 0; padding: 15px; background-color: #fee2e2; border: 2px solid #fca5a5; border-radius: 8px; }
                    .detail-row { margin: 8px 0; }
                    .label { font-weight: bold; color: #4b5563; }
                    .value { color: #111827; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    .rejection-badge { display: inline-block; padding: 8px 16px; background-color: #fee2e2; color: #991b1b; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>❌ Reschedule Request Rejected</h1>
                    </div>
                    <div class="content">
                        <p><span class="rejection-badge">Rejected</span></p>
                        <p>Your reschedule request has been reviewed and could not be accommodated at this time.</p>
                        
                        <div class="detail-row">
                            <span class="label">Customer:</span>
                            <span class="value">${reschedule.jobSummary?.customerName || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Location:</span>
                            <span class="value">${reschedule.jobSummary?.deliveryLocation || 'N/A'}</span>
                        </div>
                        
                        ${reschedule.rejectionReason ? `
                        <div class="schedule-box">
                            <h3 style="margin: 0 0 10px 0; color: #991b1b;">Reason for Rejection</h3>
                            <p style="margin: 0;">${reschedule.rejectionReason}</p>
                        </div>
                        ` : ''}
                        
                        <div class="detail-row">
                            <span class="label">Original Schedule (Still Active):</span>
                            <div style="margin-top: 8px;">
                                <div>${new Date(reschedule.oldSchedule.date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                <div>${reschedule.oldSchedule.truckId} - ${formatTimeSlot(reschedule.oldSchedule.timeSlotId)}</div>
                            </div>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Reviewed By:</span>
                            <span class="value">${reschedule.reviewedBy || 'Dispatcher'}</span>
                        </div>
                        
                        <p style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
                            <strong>Next Steps:</strong> The original schedule remains in effect. Please contact dispatch if you need to discuss alternative arrangements.
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from SECCI Delivery Portal.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const { data, error } = await resend.emails.send({
            from: 'SECCI <noreply@secci.info>',
            to: [recipientEmail],
            subject: 'Reschedule Request Rejected - SECCI',
            html: htmlContent,
        });

        if (error) {
            console.error('Resend API error:', data);
            return Response.json({ error: 'Failed to send email', details: error }, { status: 500 });
        }

        return Response.json({ success: true, messageId: data.id });
    } catch (error) {
        console.error('Error sending email:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
