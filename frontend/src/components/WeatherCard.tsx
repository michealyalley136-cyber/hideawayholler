'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CloudSun, Umbrella, AlertTriangle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { seviervilleWeather } from '@/lib/hideawayInfo';

const weatherCodeLabels: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy rain showers',
  95: 'Thunderstorms',
};

export function WeatherCard({ compact = false }: { compact?: boolean }) {
  const [weather, setWeather] = useState(seviervilleWeather);

  useEffect(() => {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=35.8687&longitude=-83.5618&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=1';
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Weather request failed'))))
      .then((data) => {
        const code = Number(data.current?.weather_code);
        setWeather({
          ...seviervilleWeather,
          temperature: `${Math.round(data.current?.temperature_2m)} deg F`,
          condition: weatherCodeLabels[code] || seviervilleWeather.condition,
          high: `${Math.round(data.daily?.temperature_2m_max?.[0])} deg F`,
          low: `${Math.round(data.daily?.temperature_2m_min?.[0])} deg F`,
          rainChance: `${Math.round(data.daily?.precipitation_probability_max?.[0] || 0)}%`,
        });
      })
      .catch(() => setWeather(seviervilleWeather));
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-700">Today's Weather</p>
          <h2 className="font-semibold text-slate-900">{weather.location}</h2>
        </div>
        <CloudSun className="h-6 w-6 text-amber-500" />
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-bold text-slate-950">{weather.temperature}</p>
            <p className="text-sm text-slate-600">{weather.condition}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-slate-500">High</p>
              <p className="font-semibold">{weather.high}</p>
            </div>
            <div>
              <p className="text-slate-500">Low</p>
              <p className="font-semibold">{weather.low}</p>
            </div>
            <div>
              <p className="text-slate-500">Rain</p>
              <p className="font-semibold">{weather.rainChance}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex gap-2">
            <Umbrella className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{weather.tips[0]}</p>
          </div>
        </div>
        {!compact && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Outdoor Preparation Tips</p>
            {weather.tips.slice(1).map((tip) => (
              <p key={tip} className="text-sm text-slate-600">{tip}</p>
            ))}
            <div className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p>{weather.alerts[0]}</p>
            </div>
          </div>
        )}
        {compact && <Link href="/weather" className="text-sm font-semibold text-brand-700 hover:text-brand-800">View weather center</Link>}
      </CardBody>
    </Card>
  );
}
