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
        const DOCEXTRACT_AI_URL = "https://delivery-docket-extractor-575c1e0e.base44.app/functions/extractDeliveryData";

        // Fetch the file and send as FormData (the external API expects file upload)
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            throw new Error('Failed to fetch file from URL');
        }
        const fileBlob = await fileResponse.blob();
        const urlParts = fileUrl.split('/');
        const filename = urlParts[urlParts.length - 1] || 'document.pdf';

        const formData = new FormData();
        formData.append('file', fileBlob, filename);

        const response = await fetch(DOCEXTRACT_AI_URL, {
            method: 'POST',
            headers: {
                'x-api-key': DOCEXTRACT_AI_API_KEY,
            },
            body: formData,
        });

        // Handle response with better error logging
        const responseText = await response.text();
        console.log('DocExtract AI response status:', response.status);
        console.log('DocExtract AI response:', responseText);

        if (!responseText) {
            throw new Error('DocExtract AI returned empty response');
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`DocExtract AI returned invalid JSON: ${responseText.substring(0, 200)}`);
        }

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