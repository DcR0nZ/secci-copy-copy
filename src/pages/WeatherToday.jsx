import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Droplets, Wind, Thermometer, Navigation, Loader2, AlertCircle, CloudRain } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WeatherToday() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const response = await base44.functions.invoke('getWeather');
        
        if (response.data && response.data.data) {
          setWeather(response.data.data);
          setError(null);
        } else if (response.data && response.data.error) {
          setError(response.data.error);
        } else {
          setError('Failed to load weather data');
        }
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError('Failed to load weather data');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch once when component mounts
    fetchWeather();
  }, []);

  const getWindDirection = (degrees) => {
    if (!degrees && degrees !== 0) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Weather Data Unavailable</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Weather Today</h1>
        <p className="text-gray-600 mt-1">Brisbane, Australia - Current conditions</p>
      </div>

      {/* Weather Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Temperature */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-900">
              {Math.round(weather.temp)}°C
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Feels like {Math.round(weather.feels_like)}°C
            </p>
            <p className="text-xs text-orange-600 mt-2 capitalize">{weather.description}</p>
          </CardContent>
        </Card>

        {/* Humidity */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Humidity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900">
              {weather.humidity}%
            </div>
            <div className="mt-3 bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${weather.humidity}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rain Chance */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-indigo-900 flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Chance of Rain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-indigo-900">
              {weather.rain_chance}%
            </div>
            <p className="text-sm text-indigo-700 mt-1">Next 12 hours</p>
            <div className="mt-3 bg-indigo-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${weather.rain_chance}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rain Amount */}
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-cyan-900 flex items-center gap-2">
              <CloudRain className="h-5 w-5" />
              Rain Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-cyan-900">
              {weather.rain_amount}mm
            </div>
            <p className="text-sm text-cyan-700 mt-1">Expected next 12 hours</p>
          </CardContent>
        </Card>

        {/* Wind Speed */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
              <Wind className="h-5 w-5" />
              Wind Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-900">
              {Math.round(weather.wind_speed * 3.6)} km/h
            </div>
            <p className="text-sm text-green-700 mt-1">
              {weather.wind_speed.toFixed(1)} m/s
            </p>
          </CardContent>
        </Card>

        {/* Wind Direction */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Wind Direction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-purple-900">
                {getWindDirection(weather.wind_deg)}
              </div>
              {weather.wind_deg !== undefined && (
                <Navigation 
                  className="h-8 w-8 text-purple-600" 
                  style={{ transform: `rotate(${weather.wind_deg}deg)` }}
                />
              )}
            </div>
            {weather.wind_deg !== undefined && (
              <p className="text-sm text-purple-700 mt-1">{weather.wind_deg}°</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Rain Radar */}
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold text-gray-900 px-6 pt-6 pb-2">Live Rain Radar - Brisbane</CardTitle>
          <p className="text-sm text-gray-600 px-6 pb-4 m-0">Interactive weather map powered by Weather Underground</p>
        </CardHeader>
        <CardContent className="p-0 m-0" style={{ marginTop: 0, paddingTop: 0 }}>
          <div className="w-full overflow-hidden" style={{ height: '800px', marginTop: 0, paddingTop: 0 }}>
            <iframe
              src="https://www.wunderground.com/wundermap/?renderer=2&Units=metric&zoom=8&lat=-27.469&lon=153.028&wxstn=1&wxstnmode=tw&aq=0&aqvalue=NaN&radar=0&radarType=NaN&radaropa=0.7&satellite=0&satelliteopa=0.8&storm-cells=0&severe=0&severeopa=0.9&sst=0&sstopa=0.8&sstanom=0&sstanomopa=0.8&fronts=0&hur=0&models=0&modelsmodel=ecmwf&modelsopa=0.8&modelstype=SURPRE&lightning=0&fire=0&fireopa=0.9&firePerimeter=0&firePerimeterOpacity=0.9&smoke=0&smokeOpacity=0.9&rep=0&surge=0&tor=0&windstr=0&windstrDensity=undefined&windstreamSpeed=undefined&windstreamSpeedFilter=undefined&windstreamPalette=undefined&hurrArch=0&hurrArchBasin=undefined&hurrArchYear=undefined&hurrArchStorm=undefined"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              title="Live Rain Radar Brisbane"
              style={{ 
                display: 'block', 
                border: 'none',
                margin: 0,
                padding: 0,
                marginTop: '-150px',
                height: 'calc(100% + 150px)'
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}