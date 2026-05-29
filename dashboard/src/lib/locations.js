// North America metro areas and cities for job search location targeting.
// Each entry: { label, value, country, region }
// value is used as the query string injected into discovery sources.

export const NORTH_AMERICA_LOCATIONS = [
  // ── United States — Northeast ─────────────────────────────────────────────
  { label: 'New York, NY', value: 'New York, NY', country: 'US', region: 'Northeast' },
  { label: 'New York Metro', value: 'New York Metro Area', country: 'US', region: 'Northeast' },
  { label: 'Boston, MA', value: 'Boston, MA', country: 'US', region: 'Northeast' },
  { label: 'Philadelphia, PA', value: 'Philadelphia, PA', country: 'US', region: 'Northeast' },
  { label: 'Washington, DC', value: 'Washington, DC', country: 'US', region: 'Northeast' },
  { label: 'Baltimore, MD', value: 'Baltimore, MD', country: 'US', region: 'Northeast' },
  { label: 'Pittsburgh, PA', value: 'Pittsburgh, PA', country: 'US', region: 'Northeast' },
  { label: 'Hartford, CT', value: 'Hartford, CT', country: 'US', region: 'Northeast' },
  { label: 'Providence, RI', value: 'Providence, RI', country: 'US', region: 'Northeast' },
  { label: 'Albany, NY', value: 'Albany, NY', country: 'US', region: 'Northeast' },
  { label: 'Buffalo, NY', value: 'Buffalo, NY', country: 'US', region: 'Northeast' },

  // ── United States — Southeast ─────────────────────────────────────────────
  { label: 'Atlanta, GA', value: 'Atlanta, GA', country: 'US', region: 'Southeast' },
  { label: 'Miami, FL', value: 'Miami, FL', country: 'US', region: 'Southeast' },
  { label: 'Tampa, FL', value: 'Tampa, FL', country: 'US', region: 'Southeast' },
  { label: 'Orlando, FL', value: 'Orlando, FL', country: 'US', region: 'Southeast' },
  { label: 'Jacksonville, FL', value: 'Jacksonville, FL', country: 'US', region: 'Southeast' },
  { label: 'Charlotte, NC', value: 'Charlotte, NC', country: 'US', region: 'Southeast' },
  { label: 'Raleigh, NC', value: 'Raleigh, NC', country: 'US', region: 'Southeast' },
  { label: 'Durham, NC', value: 'Durham, NC', country: 'US', region: 'Southeast' },
  { label: 'Nashville, TN', value: 'Nashville, TN', country: 'US', region: 'Southeast' },
  { label: 'Memphis, TN', value: 'Memphis, TN', country: 'US', region: 'Southeast' },
  { label: 'Louisville, KY', value: 'Louisville, KY', country: 'US', region: 'Southeast' },
  { label: 'Richmond, VA', value: 'Richmond, VA', country: 'US', region: 'Southeast' },
  { label: 'Virginia Beach, VA', value: 'Virginia Beach, VA', country: 'US', region: 'Southeast' },
  { label: 'New Orleans, LA', value: 'New Orleans, LA', country: 'US', region: 'Southeast' },
  { label: 'Birmingham, AL', value: 'Birmingham, AL', country: 'US', region: 'Southeast' },
  { label: 'Columbia, SC', value: 'Columbia, SC', country: 'US', region: 'Southeast' },

  // ── United States — Midwest ───────────────────────────────────────────────
  { label: 'Chicago, IL', value: 'Chicago, IL', country: 'US', region: 'Midwest' },
  { label: 'Detroit, MI', value: 'Detroit, MI', country: 'US', region: 'Midwest' },
  { label: 'Minneapolis, MN', value: 'Minneapolis, MN', country: 'US', region: 'Midwest' },
  { label: 'Columbus, OH', value: 'Columbus, OH', country: 'US', region: 'Midwest' },
  { label: 'Cleveland, OH', value: 'Cleveland, OH', country: 'US', region: 'Midwest' },
  { label: 'Cincinnati, OH', value: 'Cincinnati, OH', country: 'US', region: 'Midwest' },
  { label: 'Indianapolis, IN', value: 'Indianapolis, IN', country: 'US', region: 'Midwest' },
  { label: 'Milwaukee, WI', value: 'Milwaukee, WI', country: 'US', region: 'Midwest' },
  { label: 'Madison, WI', value: 'Madison, WI', country: 'US', region: 'Midwest' },
  { label: 'Kansas City, MO', value: 'Kansas City, MO', country: 'US', region: 'Midwest' },
  { label: 'St. Louis, MO', value: 'St. Louis, MO', country: 'US', region: 'Midwest' },
  { label: 'Omaha, NE', value: 'Omaha, NE', country: 'US', region: 'Midwest' },
  { label: 'Des Moines, IA', value: 'Des Moines, IA', country: 'US', region: 'Midwest' },
  { label: 'Ann Arbor, MI', value: 'Ann Arbor, MI', country: 'US', region: 'Midwest' },

  // ── United States — Southwest ─────────────────────────────────────────────
  { label: 'Dallas, TX', value: 'Dallas, TX', country: 'US', region: 'Southwest' },
  { label: 'Houston, TX', value: 'Houston, TX', country: 'US', region: 'Southwest' },
  { label: 'Austin, TX', value: 'Austin, TX', country: 'US', region: 'Southwest' },
  { label: 'San Antonio, TX', value: 'San Antonio, TX', country: 'US', region: 'Southwest' },
  { label: 'Phoenix, AZ', value: 'Phoenix, AZ', country: 'US', region: 'Southwest' },
  { label: 'Scottsdale, AZ', value: 'Scottsdale, AZ', country: 'US', region: 'Southwest' },
  { label: 'Tucson, AZ', value: 'Tucson, AZ', country: 'US', region: 'Southwest' },
  { label: 'Las Vegas, NV', value: 'Las Vegas, NV', country: 'US', region: 'Southwest' },
  { label: 'Albuquerque, NM', value: 'Albuquerque, NM', country: 'US', region: 'Southwest' },
  { label: 'Denver, CO', value: 'Denver, CO', country: 'US', region: 'Southwest' },
  { label: 'Boulder, CO', value: 'Boulder, CO', country: 'US', region: 'Southwest' },

  // ── United States — West ──────────────────────────────────────────────────
  { label: 'San Francisco, CA', value: 'San Francisco, CA', country: 'US', region: 'West' },
  { label: 'San Francisco Bay Area', value: 'San Francisco Bay Area', country: 'US', region: 'West' },
  { label: 'San Jose, CA', value: 'San Jose, CA', country: 'US', region: 'West' },
  { label: 'Oakland, CA', value: 'Oakland, CA', country: 'US', region: 'West' },
  { label: 'Los Angeles, CA', value: 'Los Angeles, CA', country: 'US', region: 'West' },
  { label: 'San Diego, CA', value: 'San Diego, CA', country: 'US', region: 'West' },
  { label: 'Sacramento, CA', value: 'Sacramento, CA', country: 'US', region: 'West' },
  { label: 'Seattle, WA', value: 'Seattle, WA', country: 'US', region: 'West' },
  { label: 'Portland, OR', value: 'Portland, OR', country: 'US', region: 'West' },
  { label: 'Salt Lake City, UT', value: 'Salt Lake City, UT', country: 'US', region: 'West' },
  { label: 'Boise, ID', value: 'Boise, ID', country: 'US', region: 'West' },
  { label: 'Reno, NV', value: 'Reno, NV', country: 'US', region: 'West' },
  { label: 'Anchorage, AK', value: 'Anchorage, AK', country: 'US', region: 'West' },
  { label: 'Honolulu, HI', value: 'Honolulu, HI', country: 'US', region: 'West' },

  // ── Canada ────────────────────────────────────────────────────────────────
  { label: 'Toronto, ON', value: 'Toronto, Canada', country: 'CA', region: 'Canada' },
  { label: 'Vancouver, BC', value: 'Vancouver, Canada', country: 'CA', region: 'Canada' },
  { label: 'Montreal, QC', value: 'Montreal, Canada', country: 'CA', region: 'Canada' },
  { label: 'Calgary, AB', value: 'Calgary, Canada', country: 'CA', region: 'Canada' },
  { label: 'Ottawa, ON', value: 'Ottawa, Canada', country: 'CA', region: 'Canada' },
  { label: 'Edmonton, AB', value: 'Edmonton, Canada', country: 'CA', region: 'Canada' },
  { label: 'Waterloo, ON', value: 'Waterloo, Canada', country: 'CA', region: 'Canada' },
  { label: 'Quebec City, QC', value: 'Quebec City, Canada', country: 'CA', region: 'Canada' },
  { label: 'Winnipeg, MB', value: 'Winnipeg, Canada', country: 'CA', region: 'Canada' },

  // ── Mexico ────────────────────────────────────────────────────────────────
  { label: 'Mexico City, MX', value: 'Mexico City', country: 'MX', region: 'Mexico' },
  { label: 'Monterrey, MX', value: 'Monterrey, Mexico', country: 'MX', region: 'Mexico' },
  { label: 'Guadalajara, MX', value: 'Guadalajara, Mexico', country: 'MX', region: 'Mexico' },

  // ── Remote / Any ─────────────────────────────────────────────────────────
  { label: 'Remote — Anywhere', value: 'remote', country: 'ANY', region: 'Remote' },
  { label: 'Remote — US Only', value: 'remote US', country: 'US', region: 'Remote' },
  { label: 'Remote — Canada Only', value: 'remote Canada', country: 'CA', region: 'Remote' },
  { label: 'Remote — North America', value: 'remote North America', country: 'ANY', region: 'Remote' },
];

// Grouped for picker display
export const LOCATION_GROUPS = [
  { group: 'Remote', items: NORTH_AMERICA_LOCATIONS.filter(l => l.region === 'Remote') },
  { group: 'US — Northeast', items: NORTH_AMERICA_LOCATIONS.filter(l => l.region === 'Northeast') },
  { group: 'US — Southeast', items: NORTH_AMERICA_LOCATIONS.filter(l => l.region === 'Southeast') },
  { group: 'US — Midwest', items: NORTH_AMERICA_LOCATIONS.filter(l => l.region === 'Midwest') },
  { group: 'US — Southwest', items: NORTH_AMERICA_LOCATIONS.filter(l => l.region === 'Southwest') },
  { group: 'US — West', items: NORTH_AMERICA_LOCATIONS.filter(l => l.region === 'West') },
  { group: 'Canada', items: NORTH_AMERICA_LOCATIONS.filter(l => l.country === 'CA') },
  { group: 'Mexico', items: NORTH_AMERICA_LOCATIONS.filter(l => l.country === 'MX') },
];
