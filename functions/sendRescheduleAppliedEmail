
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
        const { proposalId, affectedCustomers } = body;

        if (!proposalId || !affectedCustomers) {
            return Response.json({ error: 'Missing proposalId or affectedCustomers' }, { status: 400 });
        }

        const proposal = await base44.asServiceRole.entities.RescheduleProposal.get(proposalId);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        // Send individual emails to each affected customer
        const emailPromises = affectedCustomers.map(async (customerInfo) => {
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
                        .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                        .schedule-box { margin: 15px 0; padding: 15px; border-radius: 8px; }
                        .old-schedule { background-color: #fee2e2; border: 2px solid #fca5a5; }
                        .new-schedule { background-color: #d1fae5; border: 2px solid #6ee7b7; }
                        .detail-row { margin: 8px 0; }
                        .label { font-weight: bold; color: #4b5563; }
                        .value { color: #111827; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                        .info-badge { display: inline-block; padding: 8px 16px; background-color: #dbeafe; color: #1e40af; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>📅 Delivery Schedule Updated</h1>
                        </div>
                        <div class="content">
                            <p>Hi ${customerInfo.customerName},</p>
                            <p><span class="info-badge">Schedule Change</span></p>
                            <p>Your delivery schedule has been updated. Here are the new details:</p>
                            
                            <div class="schedule-box old-schedule">
                                <h3 style="margin: 0 0 10px 0; color: #991b1b;">Previous Schedule</h3>
                                <div class="detail-row">
                                    <span class="label">Time Slot:</span>
                                    <span class="value">${formatTimeSlot(customerInfo.oldTimeSlot)}</span>
                                </div>
                            </div>
                            
                            <div class="schedule-box new-schedule">
                                <h3 style="margin: 0 0 10px 0; color: #065f46;">✓ New Schedule</h3>
                                <div class="detail-row">
                                    <span class="label">Date:</span>
                                    <span class="value">${new Date(proposal.date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Time Slot:</span>
                                    <span class="value">${formatTimeSlot(customerInfo.newTimeSlot)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Truck:</span>
                                    <span class="value">${proposal.truckId}</span>
                                </div>
                            </div>
                            
                            <p style="margin-top: 20px;">Please ensure someone is available at the delivery location during the new time window. We apologize for any inconvenience.</p>
                            
                            ${customerInfo.reason ? `
                            <div style="margin: 15px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
                                <span class="label">Reason for change:</span><br/>
                                <span class="value">${customerInfo.reason}</span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="footer">
                            <p>This is an automated message from SECCI Delivery Portal.</p>
                            <p>If you have any questions, please contact our dispatch team.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            return resend.emails.send({
                from: 'SECCI <noreply@secci.info>',
                to: [customerInfo.email],
                subject: `Delivery Schedule Updated - ${new Date(proposal.date).toLocaleDateString('en-AU')}`,
                html: htmlContent,
            });
        });

        const results = await Promise.allSettled(emailPromises);
        
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.error('Some emails failed to send:', failures);
        }

        return Response.json({ 
            success: true, 
            sent: results.filter(r => r.status === 'fulfilled').length,
            failed: failures.length
        });
    } catch (error) {
        console.error('Error sending emails:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
