// Curated city list with IANA timezone + approximate lat/lon (equirectangular).
// Shared by TimezoneNow, TZConvert, and the world map component.

const TZ_CITIES = [
  ['UTC', 'UTC', 51.48, 0],
  ['Honolulu', 'Pacific/Honolulu', 21.31, -157.86],
  ['Anchorage', 'America/Anchorage', 61.22, -149.90],
  ['Los Angeles', 'America/Los_Angeles', 34.05, -118.24],
  ['Denver', 'America/Denver', 39.74, -104.99],
  ['Chicago', 'America/Chicago', 41.88, -87.63],
  ['New York', 'America/New_York', 40.71, -74.01],
  ['Toronto', 'America/Toronto', 43.65, -79.38],
  ['Mexico City', 'America/Mexico_City', 19.43, -99.13],
  ['Bogotá', 'America/Bogota', 4.71, -74.07],
  ['São Paulo', 'America/Sao_Paulo', -23.55, -46.63],
  ['London', 'Europe/London', 51.51, -0.13],
  ['Lisbon', 'Europe/Lisbon', 38.72, -9.14],
  ['Madrid', 'Europe/Madrid', 40.42, -3.70],
  ['Paris', 'Europe/Paris', 48.85, 2.35],
  ['Berlin', 'Europe/Berlin', 52.52, 13.40],
  ['Rome', 'Europe/Rome', 41.90, 12.50],
  ['Amsterdam', 'Europe/Amsterdam', 52.37, 4.90],
  ['Stockholm', 'Europe/Stockholm', 59.33, 18.06],
  ['Athens', 'Europe/Athens', 37.98, 23.73],
  ['Istanbul', 'Europe/Istanbul', 41.01, 28.98],
  ['Moscow', 'Europe/Moscow', 55.75, 37.62],
  ['Nairobi', 'Africa/Nairobi', -1.29, 36.82],
  ['Cairo', 'Africa/Cairo', 30.04, 31.24],
  ['Johannesburg', 'Africa/Johannesburg', -26.20, 28.05],
  ['Dubai', 'Asia/Dubai', 25.20, 55.27],
  ['Karachi', 'Asia/Karachi', 24.86, 67.00],
  ['Mumbai / Delhi', 'Asia/Kolkata', 28.61, 77.21],
  ['Dhaka', 'Asia/Dhaka', 23.81, 90.41],
  ['Bangkok', 'Asia/Bangkok', 13.76, 100.50],
  ['Singapore', 'Asia/Singapore', 1.35, 103.82],
  ['Hong Kong', 'Asia/Hong_Kong', 22.32, 114.17],
  ['Shanghai', 'Asia/Shanghai', 31.23, 121.47],
  ['Tokyo', 'Asia/Tokyo', 35.68, 139.69],
  ['Seoul', 'Asia/Seoul', 37.57, 126.98],
  ['Sydney', 'Australia/Sydney', -33.87, 151.21],
  ['Auckland', 'Pacific/Auckland', -36.85, 174.76],
];

const tzCityName = (tz) => (TZ_CITIES.find(c => c[1] === tz) || [tz])[0];
const tzCityCoords = (tz) => { const c = TZ_CITIES.find(c => c[1] === tz); return c ? { lat: c[2], lon: c[3] } : null; };
const tzOptionLabel = (name, tz) => name === tz ? name : `${name} — ${tz}`;
