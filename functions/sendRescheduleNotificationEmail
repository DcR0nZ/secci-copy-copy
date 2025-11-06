
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

        // Get users from target tenant who can approve
        const allUsers = await base44.asServiceRole.entities.User.list();
        const targetUsers = allUsers.filter(u => 
            u.tenantId === reschedule.targetTenant && 
            (u.role === 'admin' || u.appRole === 'dispatcher' || u.appRole === 'outreachOperator')
        );

        const recipientEmails = targetUsers.map(u => u.email).filter(email => email);

        if (recipientEmails.length === 0) {
            return Response.json({ error: 'No recipients found for target tenant' }, { status: 404 });
        }

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
                    .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                    .schedule-box { margin: 15px 0; padding: 15px; border-radius: 8px; }
                    .old-schedule { background-color: #fee2e2; border: 2px solid #fca5a5; }
                    .new-schedule { background-color: #d1fae5; border: 2px solid #6ee7b7; }
                    .detail-row { margin: 8px 0; }
                    .label { font-weight: bold; color: #4b5563; }
                    .value { color: #111827; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    .warning-badge { display: inline-block; padding: 8px 16px; background-color: #fef3c7; color: #92400e; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Reschedule Confirmation Required</h1>
                    </div>
                    <div class="content">
                        <p><span class="warning-badge">Action Required</span></p>
                        <p>A cross-tenant job reschedule has been requested and requires your confirmation.</p>
                        
                        <div class="detail-row">
                            <span class="label">Customer:</span>
                            <span class="value">${reschedule.jobSummary?.customerName || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Location:</span>
                            <span class="value">${reschedule.jobSummary?.deliveryLocation || 'N/A'}</span>
                        </div>
                        
                        ${reschedule.jobSummary?.machineRequired ? `
                        <div class="detail-row">
                            <span class="label">Machine Required:</span>
                            <span class="value">${reschedule.jobSummary.machineRequired}</span>
                        </div>
                        ` : ''}
                        
                        <div class="schedule-box old-schedule">
                            <h3 style="margin: 0 0 10px 0; color: #991b1b;">❌ Current Schedule</h3>
                            <div class="detail-row">
                                <span class="label">Date:</span>
                                <span class="value">${new Date(reschedule.oldSchedule.date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Truck:</span>
                                <span class="value">${reschedule.oldSchedule.truckId}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Time Slot:</span>
                                <span class="value">${formatTimeSlot(reschedule.oldSchedule.timeSlotId)}</span>
                            </div>
                        </div>
                        
                        <div class="schedule-box new-schedule">
                            <h3 style="margin: 0 0 10px 0; color: #065f46;">✓ Proposed Schedule</h3>
                            <div class="detail-row">
                                <span class="label">Date:</span>
                                <span class="value">${new Date(reschedule.newSchedule.date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Truck:</span>
                                <span class="value">${reschedule.newSchedule.truckId}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Time Slot:</span>
                                <span class="value">${formatTimeSlot(reschedule.newSchedule.timeSlotId)}</span>
                            </div>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Requested By:</span>
                            <span class="value">${reschedule.requestedBy}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Expires:</span>
                            <span class="value">${new Date(reschedule.expiresAt).toLocaleString('en-AU')}</span>
                        </div>
                        
                        <p style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
                            <strong>Action Required:</strong> Please log in to the SECCI Delivery Portal to confirm or reject this reschedule request.
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
            to: recipientEmails,
            subject: 'Reschedule Confirmation Required - SECCI',
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
