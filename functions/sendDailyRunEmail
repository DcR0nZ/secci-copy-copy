import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { driverEmail, driverName, truckId, date, jobs } = body;

        if (!driverEmail || !driverName || !truckId || !date || !jobs) {
            return Response.json({ 
                error: 'Missing required fields' 
            }, { status: 400 });
        }

        const formattedDate = new Date(date).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const timeSlotLabels = {
            'first-am': '6-8am (1st AM)',
            'second-am': '8-10am (2nd AM)',
            'lunch': '10am-12pm (LUNCH)',
            'first-pm': '12-2pm (1st PM)',
            'second-pm': '2-4pm (2nd PM)'
        };

        const jobsHtml = jobs.map((job, index) => `
            <div style="margin: 15px 0; padding: 15px; background-color: white; border-left: 4px solid #2563eb; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #2563eb;">Job ${index + 1}: ${timeSlotLabels[job.timeSlot] || job.timeSlot}</h3>
                <p style="margin: 5px 0;"><strong>Customer:</strong> ${job.customerName}</p>
                <p style="margin: 5px 0;"><strong>Location:</strong> ${job.deliveryLocation}</p>
                <p style="margin: 5px 0;"><strong>Contact:</strong> ${job.siteContactName} - ${job.siteContactPhone}</p>
                ${job.deliveryNotes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${job.deliveryNotes}</p>` : ''}
                ${job.sqm ? `<p style="margin: 5px 0;"><strong>Size:</strong> ${job.sqm}m²</p>` : ''}
            </div>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Your Delivery Run for ${formattedDate}</h1>
                        <p style="margin: 0;">${truckId}</p>
                    </div>
                    <div class="content">
                        <p>Hi ${driverName},</p>
                        <p>Here's your delivery schedule for today. You have <strong>${jobs.length}</strong> delivery/deliveries scheduled.</p>
                        
                        ${jobsHtml}
                        
                        <p style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
                            <strong>⚠️ Remember:</strong> Please submit proof of delivery photos for each completed delivery.
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from SECCI Delivery Portal.</p>
                        <p>Safe driving!</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const { data, error } = await resend.emails.send({
            from: 'SECCI <noreply@secci.info>',
            to: [driverEmail],
            subject: `Your Delivery Run - ${truckId} - ${formattedDate}`,
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