import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    // Ensure user is authenticated
    const user = await base44.auth.me();
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the file URL from the request body
        const { fileUrl } = await req.json();

        if (!fileUrl) {
            return Response.json({ error: 'No file URL provided' }, { status: 400 });
        }

        // Get API key from secrets
        const DOCEXTRACT_AI_API_KEY = Deno.env.get("DOCEXTRACT_AI_API_KEY");
        if (!DOCEXTRACT_AI_API_KEY) {
            return Response.json({ error: 'DocExtract AI API key not configured' }, { status: 500 });
        }
        
        // DocExtract AI function URL
        const DOCEXTRACT_AI_URL = "https://ta-01kb9s9zn9w91z5kwjmd9r59wf-5173.wo-9fp83urcons7cw8d8kg3x3qak.w.modal.host/functions/extractDeliveryData";

        // Send file URL directly to DocExtract AI
        const response = await fetch(DOCEXTRACT_AI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': DOCEXTRACT_AI_API_KEY,
            },
            body: JSON.stringify({ fileUrl }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('DocExtract AI error:', result);
            throw new Error(result.error || "DocExtract AI returned an error");
        }

        // The result object contains:
        // {
        //   output: { customer_name: "...", order_number: "...", delivery_address: "...", ... },
        //   validation_status: "valid" | "warning" | "invalid" | "needs_review",
        //   history_id: "..."
        // }

        return Response.json({ 
            success: true, 
            data: result.output,
            validation_status: result.validation_status,
            history_id: result.history_id
        });
    } catch (error) {
        console.error('Document processing error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});