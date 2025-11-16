import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function AddressAutocomplete({ id, value, onChange, placeholder, required }) {
  const inputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddresses = async (query) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('geoscapeAddressSearch', { query });
      
      if (!mountedRef.current) return;

      if (response.data && response.data.features) {
        setSuggestions(response.data.features);
        setShowDropdown(response.data.features.length > 0);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    
    // Update parent with raw input immediately
    if (onChange) {
      onChange({ address: newValue, latitude: null, longitude: null });
    }

    // Debounce the API search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);

    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = (feature) => {
    const formattedAddress = feature.properties.formattedAddress || feature.properties.address;
    const coords = feature.geometry.coordinates;

    if (onChange) {
      onChange({
        address: formattedAddress,
        latitude: coords[1], // GeoJSON uses [lng, lat]
        longitude: coords[0]
      });
    }

    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative" data-autocomplete-wrapper="true">
      <input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder || 'Start typing address...'}
        required={required}
        autoComplete="off"
        value={value || ''}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowDropdown(true);
          }
        }}
        data-autocomplete-input="true"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((feature, index) => {
            const address = feature.properties.formattedAddress || feature.properties.address;
            const matchType = feature.properties.matchType;
            
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(feature)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                  index === selectedIndex ? 'bg-gray-100' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-900">{address}</div>
                {matchType && (
                  <div className="text-xs text-gray-500 capitalize">{matchType}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}