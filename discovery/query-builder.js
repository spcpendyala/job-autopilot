function buildDiscoveryQueries(profile) {
  const roles = profile.targetRoles || [];
  const location = encodeURIComponent(profile.location || 'Canada');
  const remote = profile.openToRemote;
  const queries = [];

  for (const role of roles.slice(0, 5)) {
    const q = encodeURIComponent(role);

    queries.push({
      source: 'indeed',
      label: `Indeed: ${role}`,
      url: `https://www.indeed.com/rss?q=${q}&l=${location}&sort=date&fromage=1`,
      type: 'rss',
    });

    if (remote) {
      queries.push({
        source: 'indeed-remote',
        label: `Indeed Remote: ${role}`,
        url: `https://www.indeed.com/rss?q=${q}+remote&sort=date&fromage=1`,
        type: 'rss',
      });
    }
  }

  const remoteOkCategories = mapRolesToRemoteOk(roles);
  for (const cat of remoteOkCategories) {
    queries.push({
      source: 'remoteok',
      label: `Remote OK: ${cat}`,
      url: `https://remoteok.com/remote-${cat}-jobs.rss`,
      type: 'rss',
    });
  }

  if (remote) {
    queries.push({
      source: 'weworkremotely',
      label: 'We Work Remotely: Management',
      url: 'https://weworkremotely.com/categories/remote-management-business-jobs.rss',
      type: 'rss',
    });
  }

  queries.push({
    source: 'remotive',
    label: 'Remotive: Management',
    url: 'https://remotive.com/api/remote-jobs?category=management&limit=20',
    type: 'json',
  });

  return queries;
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

module.exports = { buildDiscoveryQueries };
