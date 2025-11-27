import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const EXTRACTION_API_ENDPOINT = 'https://69284e31dfb5aba9575c1e0e.base44.api/functions/invoke/extractDeliveryData';

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

    const apiKey = Deno.env.get('EXTRACTION_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'EXTRACTION_API_KEY not configured' }, { status: 500 });
    }

    // Fetch the file to send as form data
    console.log('Fetching file from:', fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file', details: `Status: ${fileResponse.status}` }, { status: 400 });
    }

    const fileBlob = await fileResponse.blob();
    
    // Determine filename from URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'document.pdf';

    // Create form data with the file
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);

    console.log('Calling extraction API...');

    // Call the external extraction API with file upload
    const extractionResponse = await fetch(EXTRACTION_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey
      },
      body: formData
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('Extraction API error status:', extractionResponse.status);
      console.error('Extraction API error:', errorText);
      return Response.json({ 
        error: 'Document extraction failed', 
        details: errorText,
        status: extractionResponse.status 
      }, { status: 500 });
    }

    const extractionResult = await extractionResponse.json();
    console.log('Extraction API response received');

    // Map the response to our expected format
    const extractedData = {
      customer_name: extractionResult.customer_name || null,
      customer_reference: extractionResult.customer_reference || null,
      delivery_address: extractionResult.delivery_address || null,
      delivery_notes: extractionResult.delivery_notes || null,
      document_id: extractionResult.document_id || null,
      order_number: extractionResult.order_number || null,
      shipping_date: extractionResult.shipping_date || null,
      line_items: extractionResult.line_items || [],
      site_contact: extractionResult.site_contact || null,
      supplier_name: extractionResult.supplier_name || null,
      total_lengths: extractionResult.total_lengths || null,
      total_lm: extractionResult.total_lm || null,
      total_m2: extractionResult.total_m2 || null,
      total_sheets: extractionResult.total_sheets || null,
      total_weight: extractionResult.total_weight || null
    };

    return Response.json({
      success: true,
      data: extractedData,
      rawResponse: extractionResult
    });

  } catch (error) {
    console.error('Extract delivery data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});