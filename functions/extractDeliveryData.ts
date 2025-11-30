import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

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
        
        const base64Data = arrayBufferToBase64(fileBuffer);
        
        // Determine mime type from URL or content-type header
        const contentType = fileResponse.headers.get('content-type');
        let mimeType = contentType || 'application/pdf';
        
        if (fileUrl.toLowerCase().includes('.png')) {
            mimeType = 'image/png';
        } else if (fileUrl.toLowerCase().includes('.jpg') || fileUrl.toLowerCase().includes('.jpeg')) {
            mimeType = 'image/jpeg';
        } else if (fileUrl.toLowerCase().includes('.pdf')) {
            mimeType = 'application/pdf';
        }
        
        console.log('Using mime type:', mimeType);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            },
            { text: prompt }
        ]);

        const responseText = result.response.text();
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
            console.error('Failed to parse Gemini response:', responseText);
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