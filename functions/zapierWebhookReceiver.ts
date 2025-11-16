import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse the incoming webhook data from Zapier
        const body = await req.json();
        
        console.log('Received Zapier webhook:', body);

        // You can process different event types from Zapier
        const { action, jobId, customerId, data, extractedData, sessionId } = body;

        // Handle document extraction results from Zapier
        if (action === 'document_extracted' && extractedData) {
            // Store the extracted data temporarily so the frontend can retrieve it
            // You could use a Message entity or create a temporary storage entity
            await base44.asServiceRole.entities.Message.create({
                content: JSON.stringify({
                    type: 'document_extraction_result',
                    sessionId: sessionId,
                    extractedData: extractedData
                }),
                senderName: 'Zapier AI',
                senderEmail: 'zapier@system',
                timestamp: new Date().toISOString()
            });

            return Response.json({ 
                success: true,
                message: 'Document extraction data received and stored',
                sessionId
            });
        }

        // Handle job updates from Zapier
        if (action === 'update_job' && jobId) {
            await base44.asServiceRole.entities.Job.update(jobId, data);
            
            return Response.json({ 
                success: true,
                message: 'Job updated successfully',
                jobId
            });
        }

        // Handle job creation from Zapier
        if (action === 'create_job' && data) {
            const newJob = await base44.asServiceRole.entities.Job.create(data);
            
            return Response.json({ 
                success: true,
                message: 'Job created successfully',
                jobId: newJob.id
            });
        }

        // Handle customer updates from Zapier
        if (action === 'update_customer' && customerId) {
            await base44.asServiceRole.entities.Customer.update(customerId, data);
            
            return Response.json({ 
                success: true,
                message: 'Customer updated successfully',
                customerId
            });
        }

        // Handle notifications
        if (action === 'send_notification') {
            // Process notification logic here
            return Response.json({ 
                success: true,
                message: 'Notification processed'
            });
        }

        // Default response for unhandled actions
        return Response.json({ 
            success: true,
            message: 'Webhook received',
            receivedData: body
        });

    } catch (error) {
        console.error('Zapier webhook receiver error:', error);
        return Response.json({ 
            error: 'Failed to process webhook',
            details: error.message 
        }, { status: 500 });
    }
});