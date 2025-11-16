import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const query = body.query;
        
        if (!query || query.trim().length < 3) {
            return Response.json({ 
                type: "FeatureCollection",
                features: [] 
            });
        }

        const apiKey = Deno.env.get('GEOSCAPE_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        // Build the predictive search URL with query parameters
        const url = new URL('https://api.psma.com.au/v2/addresses/predictive');
        url.searchParams.set('query', query);
        url.searchParams.set('maxNumberOfResults', '10');

        console.log('Calling Geoscape API:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Accept': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log('Geoscape response status:', response.status);
        console.log('Geoscape response:', responseText);

        if (!response.ok) {
            return Response.json({ 
                error: 'Address search failed',
                status: response.status,
                details: responseText
            }, { status: response.status });
        }

        const data = JSON.parse(responseText);
        
        // Return the GeoJSON response
        return Response.json(data);
        
    } catch (error) {
        console.error('Address search error:', error);
        return Response.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
});