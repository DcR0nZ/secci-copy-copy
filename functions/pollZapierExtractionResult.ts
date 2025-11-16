import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return Response.json({ error: 'sessionId is required' }, { status: 400 });
        }

        // Look for extraction result in Message entity
        const messages = await base44.entities.Message.list('-created_date', 10);
        
        const resultMessage = messages.find(m => {
            try {
                const content = JSON.parse(m.content);
                return content.type === 'document_extraction_result' && content.sessionId === sessionId;
            } catch {
                return false;
            }
        });

        if (resultMessage) {
            const content = JSON.parse(resultMessage.content);
            
            return Response.json({ 
                success: true,
                ready: true,
                extractedData: content.extractedData
            });
        } else {
            return Response.json({ 
                success: true,
                ready: false,
                message: 'Extraction still processing'
            });
        }

    } catch (error) {
        console.error('Poll extraction result error:', error);
        return Response.json({ 
            error: 'Failed to poll extraction result',
            details: error.message 
        }, { status: 500 });
    }
});