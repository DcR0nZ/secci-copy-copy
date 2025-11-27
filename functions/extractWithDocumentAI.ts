import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { SignJWT, importPKCS8 } from 'npm:jose@5.2.0';

const DOC_AI_ENDPOINT = 'https://us-documentai.googleapis.com/v1/projects/746413068428/locations/us/processors/dbeb0190f69c52d5:process';

async function getAccessToken() {
  const serviceAccountEmail = Deno.env.get('DOC_AI_SERVICE_ACCOUNT');
  const privateKeyJson = Deno.env.get('DOC_AI_KEY');

  if (!serviceAccountEmail || !privateKeyJson) {
    throw new Error('DOC_AI_SERVICE_ACCOUNT or DOC_AI_KEY environment variables not set');
  }

  let keyData;
  try {
    keyData = JSON.parse(privateKeyJson);
  } catch (e) {
    throw new Error('DOC_AI_KEY is not valid JSON');
  }

  const privateKey = await importPKCS8(keyData.private_key, 'RS256');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: serviceAccountEmail,
    sub: serviceAccountEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(privateKey);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
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

    // Fetch the file and convert to base64
    console.log('Fetching file from:', fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error('Failed to fetch file, status:', fileResponse.status);
      return Response.json({ error: 'Failed to fetch file', details: `Status: ${fileResponse.status}` }, { status: 400 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log('File size:', fileBuffer.byteLength, 'bytes');
    
    // Check file size limit (Document AI has a 20MB limit for inline documents)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (fileBuffer.byteLength > maxSize) {
      return Response.json({ 
        error: 'File too large', 
        details: 'Document AI supports files up to 20MB. Please upload a smaller file.' 
      }, { status: 400 });
    }

    // Convert to base64 in chunks to avoid call stack issues with large files
    const uint8Array = new Uint8Array(fileBuffer);
    let base64Content = '';
    const chunkSize = 32768; // Process in 32KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Content += String.fromCharCode.apply(null, chunk);
    }
    base64Content = btoa(base64Content);
    
    console.log('Base64 content length:', base64Content.length);

    // Determine mime type
    let mimeType = 'application/pdf';
    const lowerUrl = fileUrl.toLowerCase();
    if (lowerUrl.includes('.png')) {
      mimeType = 'image/png';
    } else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (lowerUrl.includes('.tiff') || lowerUrl.includes('.tif')) {
      mimeType = 'image/tiff';
    }

    // Get access token
    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    console.log('Access token obtained');

    // Call Document AI
    console.log('Calling Document AI endpoint...');
    const docAIResponse = await fetch(DOC_AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64Content,
          mimeType: mimeType
        }
      })
    });

    if (!docAIResponse.ok) {
      const errorText = await docAIResponse.text();
      console.error('Document AI error status:', docAIResponse.status);
      console.error('Document AI error:', errorText);
      return Response.json({ 
        error: 'Document AI processing failed', 
        details: errorText,
        status: docAIResponse.status 
      }, { status: 500 });
    }

    const docAIResult = await docAIResponse.json();
    console.log('Document AI response received, entities count:', docAIResult.document?.entities?.length || 0);

    // Extract entities from Document AI response
    const extractedData = {
      customer_name: null,
      customer_reference: null,
      delivery_address: null,
      delivery_notes: null,
      document_id: null,
      order_number: null,
      shipping_date: null,
      line_items: [],
      site_contact: null,
      supplier_name: null,
      total_lengths: null,
      total_lm: null,
      total_m2: null,
      total_sheets: null,
      total_weight: null
    };

    // Parse entities from the Document AI response
    const document = docAIResult.document;
    if (document && document.entities) {
      for (const entity of document.entities) {
        const type = entity.type;
        const value = entity.mentionText || entity.normalizedValue?.text || null;

        switch (type) {
          case 'customer_name':
            extractedData.customer_name = value;
            break;
          case 'customer_reference':
            extractedData.customer_reference = value;
            break;
          case 'delivery_address':
            extractedData.delivery_address = value;
            break;
          case 'delivery_notes':
            extractedData.delivery_notes = value;
            break;
          case 'document_id':
            extractedData.document_id = value;
            break;
          case 'order_number':
            extractedData.order_number = value;
            break;
          case 'shipping_date':
            extractedData.shipping_date = value;
            break;
          case 'site_contact':
            extractedData.site_contact = value;
            break;
          case 'supplier_name':
            extractedData.supplier_name = value;
            break;
          case 'total_lengths':
            extractedData.total_lengths = value ? parseFloat(value) : null;
            break;
          case 'total_lm':
            extractedData.total_lm = value ? parseFloat(value) : null;
            break;
          case 'total_m2':
            extractedData.total_m2 = value ? parseFloat(value) : null;
            break;
          case 'total_sheets':
            extractedData.total_sheets = value ? parseFloat(value) : null;
            break;
          case 'total_weight':
            extractedData.total_weight = value ? parseFloat(value) : null;
            break;
          case 'line_item':
            // Handle nested line item properties
            const lineItem = {
              ordered_quantity: null,
              product_code: null,
              product_description: null,
              weight: null
            };
            if (entity.properties) {
              for (const prop of entity.properties) {
                const propType = prop.type;
                const propValue = prop.mentionText || prop.normalizedValue?.text || null;
                switch (propType) {
                  case 'ordered_quantity':
                    lineItem.ordered_quantity = propValue;
                    break;
                  case 'product_code':
                    lineItem.product_code = propValue;
                    break;
                  case 'product_description':
                    lineItem.product_description = propValue;
                    break;
                  case 'weight':
                    lineItem.weight = propValue ? parseFloat(propValue) : null;
                    break;
                }
              }
            }
            extractedData.line_items.push(lineItem);
            break;
        }
      }
    }

    return Response.json({
      success: true,
      data: extractedData,
      rawResponse: docAIResult
    });

  } catch (error) {
    console.error('Extract with Document AI error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});