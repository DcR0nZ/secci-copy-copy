import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query } = await req.json();
        
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

        // Build the geocoder URL with query parameters
        const url = new URL('https://api.psma.com.au/v2/addresses/geocoder');
        url.searchParams.set('query', query);
        url.searchParams.set('maxNumberOfResults', '10');

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': apiKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Geoscape API error:', response.status, await response.text());
            return Response.json({ 
                error: 'Address search failed',
                status: response.status 
            }, { status: response.status });
        }

        const data = await response.json();
        
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