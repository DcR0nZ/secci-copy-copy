import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const EXTRACTION_API_ENDPOINT = 'https://ta-01kb2y1406hz51nyxgzskyet8b-5173.wo-lwkp60ljhjb9vok0sfyxofbdh.w.modal.host/functions/extractDeliveryData';

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

    console.log('Calling extraction API with fileUrl:', fileUrl);

    // Call the external extraction API
    const extractionResponse = await fetch(EXTRACTION_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileUrl })
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