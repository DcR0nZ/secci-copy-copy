import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let file_url;
    try {
      const body = await req.json();
      file_url = body.file_url;
    } catch (e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Fetch the file
    console.log('Fetching file from:', file_url);
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      console.error('Failed to fetch file:', fileResponse.status, fileResponse.statusText);
      return Response.json({ 
        error: 'Failed to fetch file', 
        details: `${fileResponse.status} ${fileResponse.statusText}` 
      }, { status: 400 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const mimeType = fileResponse.headers.get('content-type') || 'application/pdf';
    console.log('File fetched successfully, size:', fileBuffer.byteLength, 'mime:', mimeType);
    
    // Convert to base64
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    console.log('File converted to base64, length:', base64Data.length);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Gemini model initialized');

    const prompt = `Analyze this work order/delivery document and extract the following information in JSON format:

{
  "deliveryLocation": "Extract ONLY the physical street address in format: {number} {street} {type}, {suburb}, {postcode}. Example: '123 Main St, Brisbane, 4000'. DO NOT include company or customer names.",
  "poSalesDocketNumber": "Purchase order, sales order, docket, or invoice number",
  "totalUnits": "Total number of units, items, or dockets (as a number)",
  "sqm": "Total square meters or area (as a number)",
  "weightKg": "Total weight in kilograms (as a number)",
  "siteContactName": "Name of the site contact person or foreman",
  "siteContactPhone": "Phone number for the site contact",
  "requestedDate": "Requested delivery date in YYYY-MM-DD format",
  "deliveryNotes": "Any special delivery instructions or comments",
  "pickupLocation": "Supplier name, pickup location, or warehouse name"
}

Only include fields that are clearly present in the document. Return valid JSON only, no markdown formatting.`;

    console.log('Sending request to Gemini...');
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      prompt
    ]);
    console.log('Gemini response received');

    const response = result.response;
    const text = response.text();
    console.log('Gemini raw response:', text);
    
    // Clean up markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let extractedData;
    try {
      extractedData = JSON.parse(cleanedText);
      console.log('Successfully parsed JSON:', extractedData);
    } catch (e) {
      console.error('JSON parse error:', e.message);
      console.error('Cleaned text:', cleanedText);
      return Response.json({ 
        error: 'Failed to parse extraction result', 
        details: e.message,
        rawResponse: text 
      }, { status: 500 });
    }

    console.log('Extraction successful, returning data');
    return Response.json({ 
      status: 'success', 
      data: extractedData 
    });

  } catch (error) {
    console.error('Gemini extraction error:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: 'Extraction failed', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});