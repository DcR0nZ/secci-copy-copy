import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function AddressAutocomplete({ id, value, onChange, placeholder, required }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const listenerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const initAttemptedRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutsRef = useRef([]);
  const isProcessingAutocomplete = useRef(false);

  // Load Google Maps script once
  useEffect(() => {
    mountedRef.current = true;
    
    if (window.google?.maps?.places?.Autocomplete) {
      if (mountedRef.current) {
        setScriptLoaded(true);
      }
      return;
    }

    const loadScript = async () => {
      try {
        const response = await base44.functions.invoke('getGooglePlacesKey');
        const apiKey = response.data.apiKey;

        if (!mountedRef.current || !apiKey) {
          return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          const checkGoogle = setInterval(() => {
            if (!mountedRef.current) {
              clearInterval(checkGoogle);
              return;
            }
            if (window.google?.maps?.places?.Autocomplete) {
              clearInterval(checkGoogle);
              if (mountedRef.current) {
                setScriptLoaded(true);
              }
            }
          }, 100);
          
          const timeout = setTimeout(() => {
            clearInterval(checkGoogle);
            if (mountedRef.current && !window.google?.maps?.places?.Autocomplete) {
              console.error('Google Maps API failed to load');
            }
          }, 10000);
          
          timeoutsRef.current.push(checkGoogle, timeout);
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          if (!mountedRef.current) return;
          
          const checkGoogle = setInterval(() => {
            if (!mountedRef.current) {
              clearInterval(checkGoogle);
              return;
            }
            if (window.google?.maps?.places?.Autocomplete) {
              clearInterval(checkGoogle);
              if (mountedRef.current) {
                console.log('✅ Google Places Autocomplete loaded successfully');
                setScriptLoaded(true);
              }
            }
          }, 100);
          
          const timeout = setTimeout(() => {
            clearInterval(checkGoogle);
            if (mountedRef.current && !window.google?.maps?.places?.Autocomplete) {
              console.error('Google Maps API failed to initialize');
            }
          }, 10000);
          
          timeoutsRef.current.push(checkGoogle, timeout);
        };
        
        script.onerror = () => {
          if (mountedRef.current) {
            console.error('Failed to load Google Maps script');
          }
        };
        
        document.head.appendChild(script);
      } catch (error) {
        if (mountedRef.current) {
          console.error('Error loading Google Places:', error);
        }
      }
    };

    loadScript();

    return () => {
      mountedRef.current = false;
      timeoutsRef.current.forEach(timer => {
        if (typeof timer === 'number') {
          clearTimeout(timer);
          clearInterval(timer);
        }
      });
      timeoutsRef.current = [];
    };
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || autocompleteRef.current || initAttemptedRef.current || !mountedRef.current) {
      return;
    }

    if (!window.google?.maps?.places?.Autocomplete) {
      console.error('Autocomplete not available yet');
      return;
    }

    initAttemptedRef.current = true;
    console.log('🔧 Initializing Google Places Autocomplete...');

    try {
      const queenslandBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-29.0, 138.0),
        new window.google.maps.LatLng(-10.0, 154.0)
      );

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'au' },
        bounds: queenslandBounds,
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        types: ['establishment', 'geocode']
      });

      autocompleteRef.current = autocomplete;
      console.log('✅ Autocomplete initialized with establishment and geocode types');

      const listener = autocomplete.addListener('place_changed', () => {
        console.log('📍 Place changed event fired');
        
        if (!mountedRef.current) return;
        
        isProcessingAutocomplete.current = true;
        
        const place = autocomplete.getPlace();
        console.log('📍 Place object:', place);

        if (!place.geometry || !place.formatted_address) {
          console.warn('⚠️ Place missing geometry or address');
          isProcessingAutocomplete.current = false;
          return;
        }

        const addressData = {
          address: place.formatted_address,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng()
        };

        console.log('✅ Address data extracted:', addressData);

        if (onChange && mountedRef.current) {
          onChange(addressData);
          console.log('✅ onChange called with address data');
        }
        
        setTimeout(() => {
          isProcessingAutocomplete.current = false;
        }, 300);
      });

      listenerRef.current = listener;

      return () => {
        if (listenerRef.current && window.google?.maps?.event) {
          window.google.maps.event.removeListener(listenerRef.current);
          listenerRef.current = null;
        }
        autocompleteRef.current = null;
        initAttemptedRef.current = false;
      };
    } catch (error) {
      if (mountedRef.current) {
        console.error('Error initializing autocomplete:', error);
      }
      initAttemptedRef.current = false;
    }
  }, [scriptLoaded, onChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (listenerRef.current && window.google?.maps?.event) {
        window.google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      
      if (autocompleteRef.current) {
        autocompleteRef.current = null;
      }
      
      timeoutsRef.current.forEach(timer => {
        if (typeof timer === 'number') {
          clearTimeout(timer);
          clearInterval(timer);
        }
      });
      timeoutsRef.current = [];
    };
  }, []);

  const handleInputChange = (e) => {
    if (!mountedRef.current) return;
    
    if (isProcessingAutocomplete.current) {
      console.log('⏭️ Skipping input change (autocomplete is processing)');
      return;
    }
    
    const newValue = e.target.value;
    console.log('⌨️ Manual input change:', newValue);
    
    if (onChange) {
      onChange({ address: newValue, latitude: null, longitude: null });
    }
  };

  return (
    <div className="relative" data-autocomplete-wrapper="true">
      <input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder || 'Start typing address or place name...'}
        required={required}
        autoComplete="off"
        value={value || ''}
        onChange={handleInputChange}
        data-autocomplete-input="true"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {!scriptLoaded && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}
    </div>
  );
}