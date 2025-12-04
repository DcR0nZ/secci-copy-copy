import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { MapPin, Check, Loader2, Search, Building2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AddressInput({ 
  value, 
  onChange, 
  onAddressConfirmed,
  placeholder = "Enter delivery address",
  required = false,
  className 
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load saved addresses on mount
  useEffect(() => {
    const loadSavedAddresses = async () => {
      try {
        const addresses = await base44.entities.AddressLookup.list('-usageCount', 100);
        setSavedAddresses(addresses);
      } catch (err) {
        console.error('Failed to load saved addresses:', err);
      }
    };
    loadSavedAddresses();
  }, []);

  // Update input when value prop changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddresses = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const queryLower = query.toLowerCase();

    // Search own dataset first
    const matchedSaved = savedAddresses.filter(addr => 
      addr.address?.toLowerCase().includes(queryLower) ||
      addr.suburb?.toLowerCase().includes(queryLower) ||
      addr.streetName?.toLowerCase().includes(queryLower) ||
      addr.customerName?.toLowerCase().includes(queryLower)
    ).slice(0, 5);

    // Format saved addresses as suggestions
    const savedSuggestions = matchedSaved.map(addr => ({
      type: 'saved',
      address: addr.address,
      latitude: addr.latitude,
      longitude: addr.longitude,
      customerName: addr.customerName,
      siteNotes: addr.siteNotes,
      id: addr.id,
      usageCount: addr.usageCount
    }));

    // If we have fewer than 5 saved results, search Geoscape GNAF
    let gnafSuggestions = [];
    if (savedSuggestions.length < 5 && query.length >= 4) {
      try {
        const response = await base44.functions.invoke('geocodeAddress', { address: query });
        const data = response.data || response;
        
        if (data.success && data.suggestions) {
          gnafSuggestions = data.suggestions
            .filter(s => !savedSuggestions.find(saved => 
              saved.address?.toLowerCase() === s.address?.toLowerCase()
            ))
            .slice(0, 5 - savedSuggestions.length)
            .map(s => ({
              type: 'gnaf',
              address: s.address,
              latitude: s.latitude,
              longitude: s.longitude,
              suburb: s.suburb,
              state: s.state,
              postcode: s.postcode,
              gnafId: s.gnafId
            }));
        }
      } catch (err) {
        console.error('GNAF search failed:', err);
      }
    }

    setSuggestions([...savedSuggestions, ...gnafSuggestions]);
    setShowSuggestions(true);
    setLoading(false);
  };

  const geocodeAddress = async (address) => {
    setGeocoding(true);
    try {
      // Use Google Places API for geocoding
      const response = await base44.functions.invoke('geocodeAddress', { address });
      const data = response.data || response;
      
      if (data.success && data.result) {
        return {
          formattedAddress: data.result.formattedAddress || address,
          latitude: data.result.latitude,
          longitude: data.result.longitude,
          suburb: data.result.suburb,
          state: data.result.state,
          postcode: data.result.postcode
        };
      }
      return null;
    } catch (err) {
      console.error('Geocoding failed:', err);
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setConfirmedAddress(null);
    onChange?.(newValue);
    searchAddresses(newValue);
  };

  const handleSelectSuggestion = async (suggestion) => {
    setInputValue(suggestion.address);
    onChange?.(suggestion.address);
    setShowSuggestions(false);

    if (suggestion.latitude && suggestion.longitude) {
      // Already have coordinates (saved or GNAF)
      setConfirmedAddress({
        address: suggestion.address,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude
      });
      onAddressConfirmed?.({
        address: suggestion.address,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        siteNotes: suggestion.siteNotes
      });
      
      if (suggestion.type === 'saved' && suggestion.id) {
        // Update usage count for saved addresses
        try {
          await base44.entities.AddressLookup.update(suggestion.id, {
            usageCount: (suggestion.usageCount || 0) + 1
          });
        } catch (err) {
          console.error('Failed to update usage count:', err);
        }
      } else if (suggestion.type === 'gnaf') {
        // Save GNAF address for future use
        try {
          await base44.entities.AddressLookup.create({
            address: suggestion.address,
            suburb: suggestion.suburb,
            state: suggestion.state,
            postcode: suggestion.postcode,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            usageCount: 1
          });
          // Refresh saved addresses
          const addresses = await base44.entities.AddressLookup.list('-usageCount', 100);
          setSavedAddresses(addresses);
        } catch (err) {
          console.error('Failed to save GNAF address:', err);
        }
      }
    } else {
      // Need to geocode (shouldn't happen with GNAF but fallback)
      const geocoded = await geocodeAddressFunc(suggestion.address);
      if (geocoded) {
        setConfirmedAddress(geocoded);
        onAddressConfirmed?.({
          address: geocoded.formattedAddress,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude
        });
      }
    }
  };

  const handleConfirmAddress = async () => {
    if (!inputValue.trim()) return;
    
    const geocoded = await geocodeAddress(inputValue);
    if (geocoded) {
      setInputValue(geocoded.formattedAddress);
      onChange?.(geocoded.formattedAddress);
      setConfirmedAddress(geocoded);
      onAddressConfirmed?.({
        address: geocoded.formattedAddress,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude
      });

      // Save to own dataset for future use
      try {
        const existing = savedAddresses.find(a => 
          a.address?.toLowerCase() === geocoded.formattedAddress.toLowerCase()
        );
        if (!existing) {
          await base44.entities.AddressLookup.create({
            address: geocoded.formattedAddress,
            suburb: geocoded.suburb,
            state: geocoded.state,
            postcode: geocoded.postcode,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            usageCount: 1
          });
        }
      } catch (err) {
        console.error('Failed to save address:', err);
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.length >= 3 && searchAddresses(inputValue)}
            placeholder={placeholder}
            required={required}
            className={cn(
              className,
              confirmedAddress && "border-green-500 pr-8"
            )}
          />
          {confirmedAddress && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleConfirmAddress}
          disabled={!inputValue.trim() || geocoding}
          className="shrink-0"
        >
          {geocoding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-1" />
              Verify
            </>
          )}
        </Button>
      </div>

      {/* Confirmation status */}
      {confirmedAddress && (
        <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          Address verified
          {confirmedAddress.latitude && (
            <span className="text-gray-400 ml-1">
              ({confirmedAddress.latitude.toFixed(4)}, {confirmedAddress.longitude.toFixed(4)})
            </span>
          )}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-2 border-b last:border-b-0"
            >
              {suggestion.type === 'saved' ? (
                <Building2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              ) : (
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {suggestion.address}
                </div>
                {suggestion.customerName && (
                  <div className="text-xs text-blue-600">
                    {suggestion.customerName}
                  </div>
                )}
                {suggestion.type === 'saved' && (
                  <div className="text-xs text-gray-400">From your saved addresses</div>
                )}
              </div>
              {suggestion.type === 'saved' && suggestion.latitude && (
                <Check className="h-4 w-4 text-green-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching addresses...
        </div>
      )}
    </div>
  );
}