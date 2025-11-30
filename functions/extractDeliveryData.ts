import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl } = await req.json();

        if (!fileUrl) {
            return Response.json({ error: 'fileUrl is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        // Fetch the file
        console.log('Fetching file:', fileUrl);
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            console.error('File fetch failed:', fileResponse.status, fileResponse.statusText);
            return Response.json({ error: 'Failed to fetch file', status: fileResponse.status }, { status: 400 });
        }

        const fileBuffer = await fileResponse.arrayBuffer();
        console.log('File size:', fileBuffer.byteLength, 'bytes');
        
        // Convert to base64 using built-in encoding
        const uint8Array = new Uint8Array(fileBuffer);
        const base64Data = btoa(Array.from(uint8Array, byte => String.fromCharCode(byte)).join(''));
        
        // Determine mime type from URL or content-type header
        const contentType = fileResponse.headers.get('content-type');
        let mimeType = contentType || 'application/pdf';
        
        const lowerUrl = fileUrl.toLowerCase();
        if (lowerUrl.includes('.png')) {
            mimeType = 'image/png';
        } else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
            mimeType = 'image/jpeg';
        } else if (lowerUrl.includes('.pdf')) {
            mimeType = 'application/pdf';
        }
        
        console.log('Using mime type:', mimeType);

        const prompt = `You are a document data extraction assistant. Analyze this delivery docket, purchase order, work order, or invoice and extract the following information. Return ONLY a valid JSON object with these fields (use null for any field you cannot find):

{
  "customer_name": "the customer or company name receiving the delivery",
  "delivery_address": "the full delivery address",
  "order_number": "PO number, sales order number, docket number, or any reference number",
  "supplier_name": "the supplier or vendor name (company sending the goods)",
  "shipping_date": "delivery or shipping date in YYYY-MM-DD format",
  "site_contact": "name of site contact person",
  "site_contact_phone": "phone number of site contact",
  "total_m2": "total square meters as a number (no units)",
  "total_weight": "total weight in kg as a number (no units)",
  "total_sheets": "total number of sheets as a number",
  "delivery_notes": "any special delivery instructions or notes",
  "line_items": [
    {
      "product_code": "product code or SKU",
      "product_description": "description of the item",
      "quantity": "quantity as a number",
      "unit": "unit of measurement (sheets, pcs, m, etc)",
      "m2": "square meters for this item as a number",
      "weight": "weight in kg as a number"
    }
  ]
}

Important:
- Extract ALL line items you can find in the document
- For quantities, extract just the number without units
- If a field is not present, use null
- Return ONLY the JSON object, no other text`;

        console.log('Calling Gemini API...');
        
        // Call Gemini API directly via REST
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Data
                                }
                            },
                            {
                                text: prompt
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error:', geminiResponse.status, errorText);
            return Response.json({ 
                error: 'Gemini API error', 
                details: errorText 
            }, { status: 500 });
        }

        const geminiResult = await geminiResponse.json();
        console.log('Gemini response received');
        
        if (!geminiResult.candidates || !geminiResult.candidates[0]?.content?.parts?.[0]?.text) {
            console.error('Invalid Gemini response structure:', JSON.stringify(geminiResult));
            return Response.json({ 
                error: 'Invalid response from Gemini',
                details: 'No text content in response'
            }, { status: 500 });
        }

        const responseText = geminiResult.candidates[0].content.parts[0].text;
        console.log('Gemini response length:', responseText.length);
        
        // Parse JSON from response (handle markdown code blocks)
        let extractedData;
        try {
            let jsonStr = responseText.trim();
            if (jsonStr.includes('```json')) {
                jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
            } else if (jsonStr.includes('```')) {
                jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
            }
            extractedData = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', responseText.substring(0, 500));
            return Response.json({ 
                error: 'Failed to parse extracted data',
                rawResponse: responseText.substring(0, 500)
            }, { status: 500 });
        }

        console.log('Extraction successful');
        return Response.json({ 
            success: true, 
            data: extractedData 
        });

    } catch (error) {
        console.error('Document extraction error:', error);
        return Response.json({ 
            error: 'Failed to extract data from document',
            details: error.message 
        }, { status: 500 });
    }
});