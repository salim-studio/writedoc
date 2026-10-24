/**
 * DOI (Digital Object Identifier) metadata retrieval and normalization.
 * Queries Crossref API (with public CORS) and falls back to doi.org content negotiation (CSL-JSON).
 */

/** Extract clean DOI string from text, URL, or identifier. */
export function extractDoi(input) {
  if (!input) return null;
  const match = String(input).match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
  return match ? match[0].replace(/[.,;)]+$/, '') : null;
}

/** Formats author objects into a display string: "Last, First M.; Last2, First2". */
export function formatAuthorsString(authors) {
  if (!Array.isArray(authors) || !authors.length) return '';
  return authors.map(a => {
    if (a.name) return a.name;
    const parts = [a.family || a.last || ''];
    const given = [a.given || a.first || '', a.middle || ''].filter(Boolean).join(' ');
    if (given) parts.push(given);
    return parts.filter(Boolean).join(', ');
  }).filter(Boolean).join('; ');
}

/** Parse an author input string into structured author objects. */
export function parseAuthorsString(str) {
  if (!str) return [];
  const s = String(str).trim();
  if (!s) return [];
  const chunks = s.includes(';') ? s.split(';') : s.includes(' and ') ? s.split(/\s+and\s+/i) : [s];
  return chunks.map(chunk => {
    const trimmed = chunk.trim();
    if (!trimmed) return null;
    if (trimmed.includes(',')) {
      const [last, ...rest] = trimmed.split(',').map(x => x.trim());
      const firstParts = rest.join(' ').split(/\s+/).filter(Boolean);
      return { last, first: firstParts[0] || '', middle: firstParts.slice(1).join(' ') };
    }
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { last: parts[0], first: '' };
    const last = parts.pop();
    return { last, first: parts[0] || '', middle: parts.slice(1).join(' ') };
  }).filter(Boolean);
}

/** Maps Crossref/CSL type to WriteDoc source type. */
function mapDoiType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('article') || t === 'journal-article') return 'article';
  if (t === 'book-chapter' || t.includes('chapter')) return 'bookSection';
  if (t.includes('book') || t === 'monograph') return 'book';
  if (t.includes('proceedings') || t.includes('conference')) return 'article';
  if (t.includes('report')) return 'report';
  if (t.includes('dissertation') || t.includes('thesis')) return 'thesis';
  if (t.includes('web') || t.includes('dataset') || t.includes('software')) return 'website';
  return 'article';
}

/** Parses Crossref work item into clean metadata. */
export function parseCrossrefItem(item) {
  const doi = item.DOI || '';
  const title = (Array.isArray(item.title) ? item.title[0] : item.title) || '';
  const authorsList = (item.author || []).map(a => ({
    first: a.given || '',
    last: a.family || '',
    corporate: a.name || '',
  }));
  const author = formatAuthorsString(authorsList);
  const dateParts = item.published?.['date-parts']?.[0]
    || item['published-print']?.['date-parts']?.[0]
    || item['published-online']?.['date-parts']?.[0]
    || item.created?.['date-parts']?.[0]
    || [];
  const year = dateParts[0] ? String(dateParts[0]) : '';
  const journal = (Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title']) || '';
  const volume = item.volume ? String(item.volume) : '';
  const issue = item.issue ? String(item.issue) : '';
  const page = item.page ? String(item.page) : '';
  const publisher = item.publisher || '';
  const url = item.resource?.primary?.url || (doi ? `https://doi.org/${doi}` : '');
  const sourceType = mapDoiType(item.type);

  return {
    doi, title, author, authorsList, year, journal, volume, issue,
    location: page, publisher, url, sourceType,
  };
}

/** Parses CSL-JSON item into clean metadata. */
export function parseCslItem(item) {
  const doi = item.DOI || '';
  const title = item.title || '';
  const authorsList = (item.author || []).map(a => ({
    first: a.given || '',
    last: a.family || '',
    corporate: a.literal || '',
  }));
  const author = formatAuthorsString(authorsList);
  const dateParts = item.issued?.['date-parts']?.[0] || [];
  const year = dateParts[0] ? String(dateParts[0]) : '';
  const journal = item['container-title'] || item.publisher || '';
  const volume = item.volume ? String(item.volume) : '';
  const issue = item.issue ? String(item.issue) : '';
  const page = item.page ? String(item.page) : '';
  const publisher = item.publisher || '';
  const url = item.URL || (doi ? `https://doi.org/${doi}` : '');
  const sourceType = mapDoiType(item.type);

  return {
    doi, title, author, authorsList, year, journal, volume, issue,
    location: page, publisher, url, sourceType,
  };
}

/**
 * Fetches bibliographic metadata for a DOI from Crossref or doi.org.
 * @param {string} rawDoi
 * @returns {Promise<object>}
 */
export async function fetchDoiMetadata(rawDoi) {
  const doi = extractDoi(rawDoi);
  if (!doi) {
    throw new Error('Please enter a valid DOI (e.g. 10.1038/s41586-020-2649-2 or https://doi.org/...)');
  }

  // 1. Crossref REST API
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.message) return parseCrossrefItem(data.message);
    }
  } catch (e) {
    console.warn('Crossref lookup failed, trying doi.org negotiation:', e);
  }

  // 2. doi.org CSL-JSON content negotiation
  try {
    const res = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
      headers: { Accept: 'application/vnd.citationstyles.csl+json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.title || data.author)) return parseCslItem(data);
    }
  } catch (e) {
    console.warn('doi.org negotiation failed:', e);
  }

  throw new Error(`Could not find metadata for DOI "${doi}". Please verify the DOI or enter details manually.`);
}
