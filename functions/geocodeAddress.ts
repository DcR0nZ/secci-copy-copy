import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address } = await req.json();

    if (!address) {
      return Response.json({ error: 'Address is required' }, { status: 400 });
    }

    // Use Google Geocoding API
    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=au&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      // Extract address components
      let suburb = '';
      let state = '';
      let postcode = '';
      let streetNumber = '';
      let streetName = '';

      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          suburb = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }
        if (component.types.includes('postal_code')) {
          postcode = component.long_name;
        }
        if (component.types.includes('street_number')) {
          streetNumber = component.long_name;
        }
        if (component.types.includes('route')) {
          streetName = component.long_name;
        }
      }

      return Response.json({
        success: true,
        result: {
          formattedAddress: result.formatted_address,
          latitude: location.lat,
          longitude: location.lng,
          suburb,
          state,
          postcode,
          streetNumber,
          streetName,
          placeId: result.place_id
        }
      });
    }

    return Response.json({
      success: false,
      error: 'Address not found',
      status: data.status
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});