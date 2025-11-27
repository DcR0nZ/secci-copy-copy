import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const DOCEXTRACT_AI_FUNCTION_URL = 'https://69284e31dfb5aba9575c1e0e.base44.api/functions/invoke/extractDeliveryData';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const DOCEXTRACT_AI_API_KEY = Deno.env.get('EXTRACTION_API_KEY');
    if (!DOCEXTRACT_AI_API_KEY) {
      return Response.json({ error: 'EXTRACTION_API_KEY not configured' }, { status: 500 });
    }

    // Check content type to determine if it's a file upload or JSON with fileUrl
    const contentType = req.headers.get('content-type') || '';
    
    let externalFormData = new FormData();
    
    if (contentType.includes('multipart/form-data')) {
      // Direct file upload
      const formData = await req.formData();
      const file = formData.get('file');
      
      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }
      
      externalFormData.append('file', file);
    } else {
      // JSON with fileUrl - fetch and convert to file
      const { fileUrl } = await req.json();

      if (!fileUrl) {
        return Response.json({ error: 'fileUrl is required' }, { status: 400 });
      }

      console.log('Fetching file from:', fileUrl);
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        return Response.json({ error: 'Failed to fetch file', details: `Status: ${fileResponse.status}` }, { status: 400 });
      }

      const fileBlob = await fileResponse.blob();
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || 'document.pdf';
      
      externalFormData.append('file', fileBlob, fileName);
    }

    console.log('Calling DocExtract AI API...');

    const response = await fetch(DOCEXTRACT_AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'x-api-key': DOCEXTRACT_AI_API_KEY,
      },
      body: externalFormData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('DocExtract AI error status:', response.status);
      console.error('DocExtract AI error:', result);
      throw new Error(result.error || 'DocExtract AI returned an error');
    }

    console.log('DocExtract AI response received, validation_status:', result.validation_status);

    // Map the response output to our expected format
    const output = result.output || {};
    const extractedData = {
      customer_name: output.customer_name || null,
      customer_reference: output.customer_reference || null,
      delivery_address: output.delivery_address || null,
      delivery_notes: output.delivery_notes || null,
      document_id: output.document_id || null,
      order_number: output.order_number || null,
      shipping_date: output.shipping_date || null,
      line_items: output.line_items || [],
      site_contact: output.site_contact || null,
      supplier_name: output.supplier_name || null,
      total_lengths: output.total_lengths || null,
      total_lm: output.total_lm || null,
      total_m2: output.total_m2 || null,
      total_sheets: output.total_sheets || null,
      total_weight: output.total_weight || null
    };

    return Response.json({
      success: true,
      data: extractedData,
      validation_status: result.validation_status,
      history_id: result.history_id,
      rawResponse: result
    });

  } catch (error) {
    console.error('Extract delivery data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});