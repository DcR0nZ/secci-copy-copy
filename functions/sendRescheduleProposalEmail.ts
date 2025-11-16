
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
        const { proposalId } = body;

        if (!proposalId) {
            return Response.json({ error: 'Missing proposalId' }, { status: 400 });
        }

        const proposal = await base44.asServiceRole.entities.RescheduleProposal.get(proposalId);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        // Get all dispatcher and admin users
        const allUsers = await base44.asServiceRole.entities.User.list();
        const dispatcherEmails = allUsers
            .filter(u => u.role === 'admin' || u.appRole === 'dispatcher')
            .map(u => u.email)
            .filter(email => email);

        if (dispatcherEmails.length === 0) {
            return Response.json({ error: 'No dispatchers found' }, { status: 404 });
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

        const changesHtml = proposal.proposedChanges.map(change => `
            <div style="margin: 10px 0; padding: 10px; background-color: white; border-left: 3px solid #3b82f6; border-radius: 4px;">
                <div style="font-weight: bold; color: #1e40af; margin-bottom: 5px;">${change.customerName}</div>
                <div style="display: flex; align-items: center; gap: 10px; color: #4b5563;">
                    <span style="background-color: #fee2e2; padding: 4px 8px; border-radius: 4px;">${formatTimeSlot(change.oldTimeSlot)}</span>
                    <span>→</span>
                    <span style="background-color: #d1fae5; padding: 4px 8px; border-radius: 4px;">${formatTimeSlot(change.newTimeSlot)}</span>
                </div>
                ${change.reason ? `<div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Reason: ${change.reason}</div>` : ''}
            </div>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #8b5cf6; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                    .detail-row { margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; }
                    .label { font-weight: bold; color: #4b5563; }
                    .value { color: #111827; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    .ai-badge { display: inline-block; padding: 8px 16px; background-color: #ede9fe; color: #6b21a8; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🤖 AI Reschedule Proposal</h1>
                    </div>
                    <div class="content">
                        <p><span class="ai-badge">AI Generated</span></p>
                        <p>An AI-powered reschedule proposal has been generated in response to a delay.</p>
                        
                        <div class="detail-row">
                            <span class="label">Delayed Job:</span>
                            <span class="value">${proposal.delayedJobDetails?.customerName || 'N/A'}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Truck:</span>
                            <span class="value">${proposal.truckId}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Date:</span>
                            <span class="value">${new Date(proposal.date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Delay Reason:</span>
                            <span class="value">${proposal.delayReason}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">New Available Time:</span>
                            <span class="value">${proposal.newAvailableTime}</span>
                        </div>
                        
                        <div style="margin: 20px 0;">
                            <h3 style="color: #1e40af; margin-bottom: 10px;">Proposed Schedule Changes:</h3>
                            ${changesHtml}
                        </div>
                        
                        ${proposal.aiReasoning ? `
                        <div style="margin: 20px 0; padding: 15px; background-color: #ede9fe; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                            <h4 style="margin: 0 0 10px 0; color: #6b21a8;">AI Analysis:</h4>
                            <p style="margin: 0; color: #4c1d95;">${proposal.aiReasoning}</p>
                        </div>
                        ` : ''}
                        
                        <p style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
                            <strong>Action Required:</strong> Please review this AI-generated proposal in the SECCI Delivery Portal and approve or reject the changes.
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
            to: dispatcherEmails,
            subject: `AI Reschedule Proposal - ${proposal.truckId} - ${new Date(proposal.date).toLocaleDateString('en-AU')}`,
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
