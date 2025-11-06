import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the file URL from the request
        const { file_url } = await req.json();
        
        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Initialize Gemini
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        const modelName = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
        
        if (!apiKey) {
            return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Fetch the file
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
        }

        const fileBuffer = await fileResponse.arrayBuffer();
        const fileType = fileResponse.headers.get('content-type') || 'application/pdf';
        
        // Convert to base64
        const base64Data = btoa(
            new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Determine mime type
        let mimeType = fileType;
        if (file_url.toLowerCase().endsWith('.pdf')) {
            mimeType = 'application/pdf';
        } else if (file_url.toLowerCase().match(/\.(jpg|jpeg)$/)) {
            mimeType = 'image/jpeg';
        } else if (file_url.toLowerCase().endsWith('.png')) {
            mimeType = 'image/png';
        }

        // Create the prompt
        const prompt = `You are analyzing a delivery order document. Extract the following information from this document and return ONLY a valid JSON object with these exact field names:

{
  "customerName": "The customer or company name",
  "deliveryLocation": "The full delivery address including street, suburb, state and postcode",
  "poSalesDocketNumber": "Purchase order number, sales order number, docket number, or invoice number",
  "totalUnits": "Total number of units, items, or dockets (as a number, not string)",
  "sqm": "Total square meters or m² (as a number, not string)",
  "weightKg": "Total weight in kilograms (as a number, not string)",
  "siteContactName": "Name of the site contact person or foreman",
  "siteContactPhone": "Phone number for the site contact",
  "requestedDate": "Requested delivery date in YYYY-MM-DD format",
  "deliveryNotes": "Any special delivery instructions, notes, or comments",
  "pickupLocation": "Supplier name, pickup location, or warehouse name"
}

Rules:
- Return ONLY the JSON object, no additional text or explanation
- If a field cannot be found, use null for that field
- For numeric fields (totalUnits, sqm, weightKg), use actual numbers not strings
- For dates, use YYYY-MM-DD format
- Be thorough and check the entire document carefully

Now analyze this document:`;

        // Generate content with the document
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            },
            { text: prompt }
        ]);

        const response = result.response;
        const text = response.text();

        // Parse the JSON response
        let extractedData;
        try {
            // Remove markdown code blocks if present
            let jsonText = text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/g, '');
            }
            
            extractedData = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', text);
            return Response.json({
                status: 'error',
                details: 'Failed to parse AI response. Please try again or fill the form manually.',
                rawResponse: text
            }, { status: 500 });
        }

        // Clean up the data - remove null values and ensure proper types
        const cleanedData = {};
        for (const [key, value] of Object.entries(extractedData)) {
            if (value !== null && value !== undefined && value !== '') {
                cleanedData[key] = value;
            }
        }

        return Response.json({
            status: 'success',
            output: cleanedData
        });

    } catch (error) {
        console.error('Gemini extraction error:', error);
        return Response.json({
            status: 'error',
            details: error.message || 'Failed to extract data from document'
        }, { status: 500 });
    }
});