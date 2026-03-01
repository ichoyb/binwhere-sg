#!/usr/bin/env node

/**
 * BCRS Data Availability Monitor
 * Checks whether Singapore BCRS/RVM location data has become publicly available.
 *
 * Sources checked:
 * 1. data.gov.sg — Search for BCRS/RVM datasets via API
 * 2. bcrs.sg — Detect real location data (not just SPA shell)
 * 3. NEA BCRS page — Check if location info published
 * 4. OneMap — Check for BCRS thematic layer (requires free API token)
 * 5. RecycleNSave.sg — Legacy RVM program (being replaced by BCRS)
 */

const TIMEOUT = 10000;
const results = [];

function log(source, status, detail) {
  const icon = status === 'found' ? '✅' : status === 'error' ? '⚠️' : '❌';
  results.push({ source, status, detail, icon });
  console.log(`${icon} [${source}] ${detail}`);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Detect SPA shell pages that return 200 for any route */
function isSpaShell(html) {
  return (
    html.length < 2000 &&
    (/you need to enable javascript/i.test(html) || /noscript/i.test(html)) &&
    !/latitude|longitude|"lat"|"lng"|"address"/i.test(html)
  );
}

// 1. data.gov.sg — Search for BCRS/RVM datasets
async function checkDataGov() {
  const queries = ['reverse+vending', 'beverage+container+return', 'BCRS', 'RVM'];

  for (const q of queries) {
    try {
      const url = `https://api-open.data.gov.sg/v1/public/api/datasets?query=${q}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;

      const data = await res.json();
      const datasets = data?.data?.datasets || data?.datasets || [];

      if (datasets.length > 0) {
        const names = datasets.map(d => d.name || d.title).filter(Boolean).join(', ');
        log('data.gov.sg', 'found', `Found ${datasets.length} dataset(s) for "${q}": ${names}`);
        return;
      }
    } catch {
      // continue to next query
    }
  }

  log('data.gov.sg', 'not_found', 'No BCRS/RVM datasets found (searched: reverse vending, beverage container return, BCRS, RVM)');
}

// 2. bcrs.sg — Check for real location data (not SPA shell)
async function checkBcrsSg() {
  // Get the SPA shell baseline
  let shellSize = 0;
  try {
    const res = await fetchWithTimeout('https://bcrs.sg');
    if (res.ok) {
      const html = await res.text();
      shellSize = html.length;
    }
  } catch {
    log('bcrs.sg', 'error', 'Cannot reach bcrs.sg');
    return;
  }

  // Check location-related paths — look for DIFFERENT content from the shell
  const paths = ['/locations', '/find', '/map', '/return-points', '/where-to-return'];
  for (const path of paths) {
    try {
      const res = await fetchWithTimeout(`https://bcrs.sg${path}`, { redirect: 'follow' });
      if (!res.ok) continue;

      const html = await res.text();

      // Same size as shell = SPA catch-all, no real server-side content
      if (Math.abs(html.length - shellSize) < 100 || isSpaShell(html)) continue;

      // Real content — different from the generic shell
      const hasLocationData = /latitude|longitude|"lat"|"lng"|"address"|maps|mapbox|google.*map/i.test(html);
      if (hasLocationData) {
        log('bcrs.sg', 'found', `Real location content at bcrs.sg${path} (${html.length} bytes, shell was ${shellSize})`);
        return;
      }
    } catch {
      // continue
    }
  }

  // Also probe common API patterns with JSON content-type
  const apiPaths = ['/api/locations', '/api/return-points', '/api/v1/locations', '/api/points'];
  for (const path of apiPaths) {
    try {
      const res = await fetchWithTimeout(`https://bcrs.sg${path}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const text = await res.text();
        if (text.length > 100 && !isSpaShell(text)) {
          log('bcrs.sg', 'found', `JSON API endpoint at bcrs.sg${path} (${text.length} bytes)`);
          return;
        }
      }
    } catch {
      // continue
    }
  }

  log('bcrs.sg', 'not_found', `SPA shell only (${shellSize} bytes for all routes). No real location data yet.`);
}

// 3. NEA BCRS page — Check for location info
async function checkNEA() {
  try {
    const url = 'https://www.nea.gov.sg/our-services/waste-management/beverage-container-return-scheme';
    const res = await fetchWithTimeout(url);

    if (res.ok) {
      const html = await res.text();
      const locationPhrases = [
        'return point locations',
        'find a return point',
        'list of return points',
        'RVM locations',
        'download.*location',
        'map of return points',
      ];

      const found = locationPhrases.filter(phrase => new RegExp(phrase, 'i').test(html));
      const stillPending = /will be made available/i.test(html);

      if (found.length > 0 && !stillPending) {
        log('NEA', 'found', `BCRS page now contains location info: ${found.join(', ')}`);
        return;
      }

      if (stillPending) {
        log('NEA', 'not_found', 'Page still says "will be made available in the future"');
        return;
      }

      log('NEA', 'not_found', 'No location data detected on BCRS page');
    } else {
      log('NEA', 'error', `HTTP ${res.status}`);
    }
  } catch (err) {
    log('NEA', 'error', `Request failed: ${err.message}`);
  }
}

// 4. OneMap — Check for BCRS thematic layer
async function checkOneMap() {
  // OneMap API now requires auth token. Try the public themes endpoint anyway.
  try {
    const url = 'https://www.onemap.gov.sg/api/public/themesvc/getAllThemesInfo?moreInfo=Y';
    const res = await fetchWithTimeout(url);

    if (res.status === 401) {
      log('OneMap', 'not_found', 'API requires auth token — cannot check themes (register at onemap.gov.sg for free token)');
      return;
    }

    if (res.ok) {
      const data = await res.json();
      const themes = data?.Theme_Names || [];

      const bcrsThemes = themes.filter(t => {
        const name = (t.THEMENAME || '').toLowerCase();
        const desc = (t.THEMEDESCRIPTION || '').toLowerCase();
        return ['bcrs', 'reverse vending', 'beverage container', 'rvm', 'return point'].some(
          kw => name.includes(kw) || desc.includes(kw),
        );
      });

      if (bcrsThemes.length > 0) {
        const names = bcrsThemes.map(t => t.THEMENAME).join(', ');
        log('OneMap', 'found', `Found BCRS-related theme(s): ${names}`);
        return;
      }

      log('OneMap', 'not_found', `No BCRS/RVM theme found (checked ${themes.length} themes)`);
    } else {
      log('OneMap', 'error', `HTTP ${res.status}`);
    }
  } catch (err) {
    log('OneMap', 'error', `Request failed: ${err.message}`);
  }
}

// 5. Google Maps — Check if RVMs are indexed as POIs (no API key needed)
async function checkGoogleMaps() {
  try {
    // Use Google's unauthenticated search suggestions endpoint to detect RVM POIs
    const query = encodeURIComponent('reverse vending machine BCRS Singapore');
    const url = `https://www.google.com/maps/search/${query}/`;
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BinWhere-Monitor/1.0)' },
      redirect: 'follow',
    });

    if (res.ok) {
      const html = await res.text();
      // Google Maps embeds place data in the HTML; look for indicators of actual place results
      const hasPlaces = /reverse vending|BCRS|return point/i.test(html) && /rating|reviews|directions/i.test(html);
      const placeCount = (html.match(/reverse vending/gi) || []).length;

      if (hasPlaces && placeCount >= 2) {
        log('Google Maps', 'found', `RVM-related places detected on Google Maps (~${placeCount} mentions). May have POI listings.`);
        return;
      }

      log('Google Maps', 'not_found', `No significant RVM POI listings detected (${placeCount} keyword matches)`);
    } else {
      log('Google Maps', 'not_found', `HTTP ${res.status} — Google Maps search not accessible`);
    }
  } catch (err) {
    log('Google Maps', 'error', `Request failed: ${err.message}`);
  }
}

// 6. RecycleNSave.sg — Legacy RVM program
async function checkRecycleNSave() {
  try {
    const res = await fetchWithTimeout('https://recyclensave.sg/locations');

    if (res.ok) {
      const html = await res.text();
      const hasLocations = /location|address|postal/i.test(html) && html.length > 2000;

      if (hasLocations) {
        log('RecycleNSave', 'found', `Legacy RVM locations page is live (${html.length} bytes). Note: being replaced by BCRS.`);
        return;
      }
    }

    log('RecycleNSave', 'not_found', 'Legacy program page not available');
  } catch (err) {
    log('RecycleNSave', 'error', `Request failed: ${err.message}`);
  }
}

// Run all checks
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   BCRS / RVM Data Availability Check     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Date:   ${new Date().toISOString().split('T')[0]}`);
  console.log(`  Launch: 1 April 2026`);
  console.log(`  Days until launch: ${Math.ceil((new Date('2026-04-01') - new Date()) / 86400000)}`);
  console.log('');

  await Promise.all([checkDataGov(), checkBcrsSg(), checkNEA(), checkOneMap(), checkGoogleMaps(), checkRecycleNSave()]);

  console.log('');
  console.log('=== Summary ===');

  const bcrsNewSources = ['data.gov.sg', 'bcrs.sg', 'NEA', 'OneMap', 'Google Maps'];
  const newFound = results.filter(r => r.status === 'found' && bcrsNewSources.includes(r.source));
  const legacyFound = results.filter(r => r.status === 'found' && !bcrsNewSources.includes(r.source));
  const notFound = results.filter(r => r.status === 'not_found');
  const errors = results.filter(r => r.status === 'error');

  if (newFound.length > 0) {
    console.log(`🎉 BCRS DATA FOUND in ${newFound.length} source(s)! Time to integrate RVM into BinWhere!`);
    newFound.forEach(r => console.log(`   ${r.icon} ${r.source}: ${r.detail}`));
  } else {
    console.log(`📭 No BCRS location data yet (${notFound.length} sources checked, ${errors.length} errors).`);
    console.log('   Check again closer to 1 April 2026 launch.');
  }

  if (legacyFound.length > 0) {
    console.log('');
    console.log('📋 Legacy data (not BCRS):');
    legacyFound.forEach(r => console.log(`   ${r.icon} ${r.source}: ${r.detail}`));
  }

  console.log('');
  console.log('Sources monitored:');
  console.log('  - data.gov.sg (official open data)');
  console.log('  - bcrs.sg (scheme operator website)');
  console.log('  - NEA BCRS page (government)');
  console.log('  - OneMap thematic layers (geospatial)');
  console.log('  - Google Maps (POI listings)');
  console.log('  - RecycleNSave.sg (legacy program)');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
