// Returns whether any of the profile locations is a remote variant
function hasRemoteLocation(locations) {
  if (!Array.isArray(locations) || locations.length === 0) return false;
  return locations.some(l => l === 'remote' || l.startsWith('remote '));
}

// Returns physical (non-remote) location values from the locations array,
// falling back to the legacy profile.location string, then 'Canada'.
function getPhysicalLocations(profile) {
  const locs = profile.locations || [];
  const physical = locs.filter(l => l !== 'remote' && !l.startsWith('remote '));
  if (physical.length > 0) return physical;
  if (profile.location) return [profile.location];
  return ['Canada'];
}

// Canadian location values end with ', Canada' or are 'remote Canada'
function getCanadianLocations(locations) {
  return locations.filter(l => l.endsWith(', Canada') || l === 'remote Canada');
}

// US location values contain a state abbreviation pattern (", XX") and no 'Canada'/'Mexico'/'remote'
function getUSLocations(locations) {
  return locations.filter(l =>
    !l.startsWith('remote') &&
    !l.includes('Canada') &&
    !l.includes('Mexico') &&
    l.includes(',')
  );
}

const TECH_KEYWORDS = ['engineer', 'developer', 'devops', 'sre', 'data', 'cloud', 'software', 'infrastructure', 'security', 'architect'];
function isTechRole(roles) {
  const str = roles.join(' ').toLowerCase();
  return TECH_KEYWORDS.some(kw => str.includes(kw));
}

// Built In only covers select US metros — map location value strings to slugs
const BUILTIN_CITY_MAP = {
  'New York': 'new-york',
  'San Francisco': 'san-francisco',
  'Austin': 'austin',
  'Seattle': 'seattle',
  'Boston': 'boston',
  'Chicago': 'chicago',
  'Denver': 'denver',
  'Los Angeles': 'los-angeles',
};

function getBuiltInSlugs(usLocations) {
  const slugs = [];
  for (const loc of usLocations) {
    for (const [city, slug] of Object.entries(BUILTIN_CITY_MAP)) {
      if (loc.includes(city) && !slugs.includes(slug)) {
        slugs.push(slug);
      }
    }
  }
  return slugs;
}

function mapRolesToRemoteOk(roles) {
  const roleStr = roles.join(' ').toLowerCase();
  const cats = [];
  if (roleStr.includes('operations') || roleStr.includes('manager')) cats.push('operations');
  if (roleStr.includes('account') || roleStr.includes('tam') || roleStr.includes('customer')) cats.push('customer-success');
  if (roleStr.includes('product')) cats.push('product');
  if (roleStr.includes('engineer') || roleStr.includes('developer')) cats.push('dev');
  return cats.length ? cats : ['operations'];
}

// Map roles to The Muse category strings
function mapRolesToMuse(roles) {
  const str = roles.join(' ').toLowerCase();
  const cats = [];
  if (str.includes('engineer') || str.includes('developer') || str.includes('software')) cats.push('Engineering');
  if (str.includes('operations') || str.includes('manager')) cats.push('Operations');
  if (str.includes('customer') || str.includes('account') || str.includes('success')) cats.push('Customer Service');
  if (str.includes('product')) cats.push('Product');
  if (!cats.length) cats.push('Operations');
  return cats.slice(0, 2);
}

function buildDiscoveryQueries(profile) {
  const roles = profile.targetRoles || [];
  const wantsRemote = profile.openToRemote || hasRemoteLocation(profile.locations);
  const physicalLocations = getPhysicalLocations(profile);
  const allLocations = profile.locations || [];
  const canadianLocs = getCanadianLocations(allLocations);
  const usLocs = getUSLocations(allLocations);
  const isTech = isTechRole(roles);
  const queries = [];

  // ── Indeed ────────────────────────────────────────────────────────────────
  for (const role of roles.slice(0, 5)) {
    const q = encodeURIComponent(role);
    for (const loc of physicalLocations.slice(0, 3)) {
      queries.push({
        source: 'indeed', label: `Indeed: ${role} in ${loc}`,
        url: `https://www.indeed.com/rss?q=${q}&l=${encodeURIComponent(loc)}&sort=date&fromage=1`,
        type: 'rss', category: 'general',
      });
    }
    if (wantsRemote) {
      queries.push({
        source: 'indeed-remote', label: `Indeed Remote: ${role}`,
        url: `https://www.indeed.com/rss?q=${q}+remote&sort=date&fromage=1`,
        type: 'rss', category: 'remote',
      });
    }
  }

  // ── Remote OK ─────────────────────────────────────────────────────────────
  const remoteOkCategories = mapRolesToRemoteOk(roles);
  for (const cat of remoteOkCategories) {
    queries.push({
      source: 'remoteok', label: `Remote OK: ${cat}`,
      url: `https://remoteok.com/remote-${cat}-jobs.rss`,
      type: 'rss', category: 'remote',
    });
  }

  // ── We Work Remotely ──────────────────────────────────────────────────────
  if (wantsRemote) {
    queries.push({
      source: 'weworkremotely', label: 'We Work Remotely: Management',
      url: 'https://weworkremotely.com/categories/remote-management-business-jobs.rss',
      type: 'rss', category: 'remote',
    });
  }

  // ── Remotive ──────────────────────────────────────────────────────────────
  queries.push({
    source: 'remotive', label: 'Remotive: Management',
    url: 'https://remotive.com/api/remote-jobs?category=management&limit=20',
    type: 'json', category: 'remote',
  });

  // ── Jobicy (free JSON API, no key required) ────────────────────────────────
  if (wantsRemote) {
    queries.push({
      source: 'jobicy', label: 'Jobicy: Remote Jobs',
      url: 'https://jobicy.com/api/v2/remote-jobs?count=20',
      type: 'json', category: 'remote',
    });
  }

  // ── Arbeitnow (free JSON API, no key required) ─────────────────────────────
  queries.push({
    source: 'arbeitnow', label: 'Arbeitnow: Jobs',
    url: 'https://arbeitnow.com/api/job-board-api?page=1',
    type: 'json', category: 'general',
  });

  // ── Remote-focused RSS boards ─────────────────────────────────────────────
  if (wantsRemote) {
    queries.push({
      source: 'himalayas', label: 'Himalayas: Remote Jobs',
      url: 'https://himalayas.app/jobs/rss',
      type: 'rss', category: 'remote',
    });
    queries.push({
      source: 'remoteco', label: 'Remote.co: Remote Jobs',
      url: 'https://remote.co/remote-jobs/feed/',
      type: 'rss', category: 'remote',
    });
    queries.push({
      source: 'workingnomads', label: 'Working Nomads',
      url: 'https://www.workingnomads.com/feed',
      type: 'rss', category: 'remote',
    });
    queries.push({
      source: 'jobspresso', label: 'Jobspresso',
      url: 'https://jobspresso.co/feed/',
      type: 'rss', category: 'remote',
    });
    queries.push({
      source: '4dayweek', label: '4 Day Week',
      url: 'https://4dayweek.io/feed',
      type: 'rss', category: 'remote',
    });
    queries.push({
      source: 'nodesk', label: 'NoDesk: Remote Jobs',
      url: 'https://nodesk.co/remote-jobs/rss/',
      type: 'rss', category: 'remote',
    });
  }

  // ── Job Bank Canada (government — only for Canadian locations) ────────────
  if (canadianLocs.length > 0) {
    const physicalCanadian = canadianLocs.filter(l => !l.startsWith('remote'));
    const cityLoc = physicalCanadian[0] || canadianLocs[0];
    // Strip ', Canada' suffix for the Job Bank location search string
    const city = cityLoc.replace(', Canada', '').replace('remote ', '');
    for (const role of roles.slice(0, 3)) {
      queries.push({
        source: 'jobbank', label: `Job Bank Canada: ${role} in ${city}`,
        url: `https://www.jobbank.gc.ca/jobsearch/rss?searchstring=${encodeURIComponent(role)}&locationstring=${encodeURIComponent(city)}`,
        type: 'rss', category: 'canada',
      });
    }
  }

  // ── Dice (tech roles only) ─────────────────────────────────────────────────
  if (isTech) {
    for (const role of roles.slice(0, 3)) {
      for (const loc of physicalLocations.slice(0, 2)) {
        queries.push({
          source: 'dice', label: `Dice: ${role}`,
          url: `https://www.dice.com/jobs/q-${encodeURIComponent(role)}-l-${encodeURIComponent(loc)}.rss`,
          type: 'rss', category: 'tech',
        });
      }
    }
  }

  // ── Built In (US metros only) ──────────────────────────────────────────────
  if (usLocs.length > 0) {
    const slugs = getBuiltInSlugs(usLocs);
    for (const slug of slugs.slice(0, 3)) {
      queries.push({
        source: 'builtin', label: `Built In: ${slug.replace(/-/g, ' ')}`,
        url: `https://builtin.com/jobs/rss/${slug}`,
        type: 'rss', category: 'tech',
      });
    }
  }

  // ── The Muse (free JSON API, no key required) ─────────────────────────────
  const museCategories = mapRolesToMuse(roles);
  for (const cat of museCategories) {
    queries.push({
      source: 'themuse', label: `The Muse: ${cat}`,
      url: `https://www.themuse.com/api/public/jobs?page=0&descending=true&level=Senior+Level&level=Mid+Level&category=${encodeURIComponent(cat)}`,
      type: 'json', category: 'general',
    });
  }

  // ── Adzuna (requires API key) ──────────────────────────────────────────────
  if (process.env.ADZUNA_APP_ID) {
    const country = canadianLocs.length > 0 ? 'ca' : 'us';
    const locStr = physicalLocations[0] || '';
    for (const role of roles.slice(0, 2)) {
      queries.push({
        source: 'adzuna', label: `Adzuna: ${role}`,
        url: `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY || ''}&results_per_page=20&what=${encodeURIComponent(role)}&where=${encodeURIComponent(locStr)}&sort_by=date`,
        type: 'json', category: 'general',
      });
    }
  }

  // ── HN Who's Hiring (monthly, high signal for tech/startup) ───────────────
  if (roles.length > 0) {
    queries.push({
      source: 'hn-hiring', label: "HN: Who's Hiring",
      type: 'hn', category: 'startup',
      roles, // passed to fetchHNHiring for comment filtering
    });
  }

  return queries;
}

module.exports = { buildDiscoveryQueries };
