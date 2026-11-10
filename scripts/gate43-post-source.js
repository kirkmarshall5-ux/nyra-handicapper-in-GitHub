// Research recorder source classification; no changes to ranking or betting logic.
export function officialPostTimeSourceType(provider, sourceUrl) {
  if (provider !== 'DRF' && provider !== 'BRISNET') throw Error('Verified PP provider required.');
  let url;
  try { url = new URL(sourceUrl); } catch { throw Error('Official post-time HTTPS URL required.'); }
  if (url.protocol !== 'https:' || !url.hostname) throw Error('Official post-time HTTPS URL required.');
  return /(^|\.)nyra\.com$/i.test(url.hostname) ? 'NYRA_OFFICIAL' : 'TRACK_OFFICIAL';
}
