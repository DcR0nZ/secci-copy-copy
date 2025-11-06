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

    try {
      const queenslandBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-29.0, 138.0),
        new window.google.maps.LatLng(-10.0, 154.0)
      );

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'au' },
        bounds: queenslandBounds,
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['address']
      });

      autocompleteRef.current = autocomplete;

      const listener = autocomplete.addListener('place_changed', () => {
        if (!mountedRef.current) return;
        
        // Set flag immediately to prevent input change handler
        isProcessingAutocomplete.current = true;
        
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.formatted_address) {
          isProcessingAutocomplete.current = false;
          return;
        }

        // Update parent with selected address and coordinates
        if (onChange && mountedRef.current) {
          onChange({
            address: place.formatted_address,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng()
          });
        }
        
        // Keep flag set for a bit longer to ensure input change event doesn't override
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

  // Handle manual input value changes
  const handleInputChange = (e) => {
    if (!mountedRef.current) return;
    
    // Don't process if autocomplete is currently selecting
    if (isProcessingAutocomplete.current) {
      return;
    }
    
    const newValue = e.target.value;
    
    // Call onChange with new address but null coordinates (manual input)
    if (onChange) {
      onChange({ address: newValue, latitude: null, longitude: null });
    }
  };

  const handleWrapperClick = (e) => {
    e.stopPropagation();
  };

  const handleWrapperMouseDown = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      onClick={handleWrapperClick} 
      onMouseDown={handleWrapperMouseDown}
      className="relative"
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder || 'Start typing address...'}
        required={required}
        autoComplete="off"
        value={value || ''}
        onChange={handleInputChange}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
}