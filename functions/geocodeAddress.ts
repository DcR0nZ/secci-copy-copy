import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, lat, lon } = await req.json();
    
    const apiKey = Deno.env.get('GEOSCAPE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Geoscape API key not configured' }, { status: 500 });
    }

    let result;

    // If lat/lon provided, do reverse geocode
    if (lat && lon) {
      const url = `https://api.geoscape.com.au/v2/addresses/reverse-geocode?lat=${lat}&lon=${lon}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Geoscape reverse geocode error:', response.status, errorText);
        return Response.json({ error: 'Failed to reverse geocode location' }, { status: response.status });
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const addr = data.data[0];
        result = {
          address: addr.addressString || addr.formattedAddress,
          streetNumber: addr.streetNumber,
          streetName: addr.streetName,
          streetType: addr.streetType,
          suburb: addr.locality,
          state: addr.state,
          postcode: addr.postcode,
          latitude: addr.location?.lat || lat,
          longitude: addr.location?.lon || lon,
          confidence: addr.confidence,
          gnafId: addr.addressId
        };
      }
    } 
    // Forward geocode - search by address string
    else if (address) {
      const url = `https://api.geoscape.com.au/v2/addresses?query=${encodeURIComponent(address)}&limit=10`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Geoscape address search error:', response.status, errorText);
        return Response.json({ error: 'Failed to search addresses' }, { status: response.status });
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Return multiple suggestions for autocomplete
        const suggestions = data.data.map(addr => ({
          address: addr.addressString || addr.formattedAddress,
          streetNumber: addr.streetNumber,
          streetName: addr.streetName,
          streetType: addr.streetType,
          suburb: addr.locality,
          state: addr.state,
          postcode: addr.postcode,
          latitude: addr.location?.lat,
          longitude: addr.location?.lon,
          confidence: addr.confidence,
          gnafId: addr.addressId
        }));

        return Response.json({
          success: true,
          suggestions,
          result: suggestions[0] // Best match
        });
      }
    } else {
      return Response.json({ error: 'Address or coordinates required' }, { status: 400 });
    }

    if (result) {
      return Response.json({
        success: true,
        result
      });
    } else {
      return Response.json({
        success: false,
        error: 'No results found'
      });
    }

  } catch (error) {
    console.error('Geocode error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});