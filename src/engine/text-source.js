/**
 * Academic source identification and metadata lookup from text snippets.
 * Supports Crossref and OpenAlex APIs for locating scholarly articles, books,
 * journal publications, author details, publication years, and page numbers.
 */

import { formatAuthorsString, parseAuthorsString } from './doi.js';

/**
 * Clean and extract optimal search phrases from raw text or OCR output.
 * @param {string} rawText
 * @returns {{ query: string, phrases: string[] }}
 */
export function extractSearchQueries(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { query: '', phrases: [] };
  }

  // Remove control characters and normalize whitespace
  const normalized = rawText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!normalized) return { query: '', phrases: [] };

  const phrases = [];

  // 1. Quoted text if present
  const quotes = normalized.match(/"([^"]{15,150})"/);
  if (quotes && quotes[1]) {
    phrases.push(quotes[1].trim());
  }

  // 2. Sentence breakdown
  const sentences = normalized
    .split(/(?<=[.!?؟])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 15 && s.length <= 160);

  if (sentences.length > 0) {
    phrases.push(...sentences.slice(0, 3));
  }

  // 3. First 120 characters or 10-15 words
  const words = normalized.split(/\s+/).slice(0, 14).join(' ');
  if (words && !phrases.includes(words)) {
    phrases.push(words);
  }

  const query = phrases[0] || normalized.slice(0, 120);
  return { query, phrases };
}

/**
 * Search Crossref works API for bibliographic matches.
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
async function searchCrossref(query, maxResults = 5) {
  const url = `https://api.crossref.org/works?rows=${maxResults}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];

  const data = await res.json();
  const items = data.message?.items || [];

  return items.map(item => {
    const rawAuthors = item.author || [];
    const authorsList = rawAuthors.map(a => ({
      family: a.family || '',
      given: a.given || '',
    })).filter(a => a.family || a.given);

    const authors = authorsList.length ? formatAuthorsString(authorsList) : '';
    const issued = item.issued?.['date-parts']?.[0];
    const year = issued && issued[0] ? String(issued[0]) : '';
    const title = Array.isArray(item.title) ? item.title[0] : (item.title || '');
    const container = Array.isArray(item['container-title']) ? item['container-title'][0] : (item['container-title'] || '');
    const volume = item.volume ? String(item.volume) : '';
    const issue = item.issue ? String(item.issue) : '';
    const page = item.page || '';
    const publisher = item.publisher || '';
    const doi = item.DOI || '';
    const itemUrl = doi ? `https://doi.org/${doi}` : (item.URL || '');

    let sourceType = 'article';
    const crossType = (item.type || '').toLowerCase();
    if (crossType.includes('book-chapter') || crossType.includes('section')) sourceType = 'bookSection';
    else if (crossType.includes('book') || crossType.includes('monograph')) sourceType = 'book';
    else if (crossType.includes('report')) sourceType = 'report';

    return {
      source: 'Crossref',
      id: doi || title,
      title: title.trim(),
      authors,
      authorsList,
      year,
      journal: container.trim(),
      volume,
      issue,
      location: page ? (page.includes('-') || page.includes('–') ? `pp. ${page}` : `p. ${page}`) : '',
      rawPage: page,
      publisher: publisher.trim(),
      doi,
      url: itemUrl,
      sourceType,
    };
  });
}

/**
 * Search OpenAlex works API for bibliographic matches.
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
async function searchOpenAlex(query, maxResults = 5) {
  try {
    const url = `https://api.openalex.org/works?per_page=${maxResults}&search=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];

    return results.map(item => {
      const authorsList = (item.authorships || []).map(a => {
        const name = a.author?.display_name || '';
        const parts = name.trim().split(/\s+/);
        const family = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
        const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        return { family, given };
      }).filter(a => a.family || a.given);

      const authors = authorsList.length ? formatAuthorsString(authorsList) : '';
      const year = item.publication_year ? String(item.publication_year) : '';
      const title = item.title || '';
      const container = item.primary_location?.source?.display_name || '';
      const volume = item.biblio?.volume ? String(item.biblio.volume) : '';
      const issue = item.biblio?.issue ? String(item.biblio.issue) : '';
      const firstPage = item.biblio?.first_page;
      const lastPage = item.biblio?.last_page;
      const rawPage = [firstPage, lastPage].filter(Boolean).join('-');
      const page = rawPage ? (rawPage.includes('-') ? `pp. ${rawPage}` : `p. ${rawPage}`) : '';
      const doi = item.doi ? item.doi.replace(/^https?:\/\/doi\.org\//i, '') : '';
      const itemUrl = item.doi || item.id || '';

      let sourceType = 'article';
      const type = (item.type || '').toLowerCase();
      if (type.includes('book-chapter') || type.includes('section')) sourceType = 'bookSection';
      else if (type.includes('book')) sourceType = 'book';
      else if (type.includes('report')) sourceType = 'report';

      return {
        source: 'OpenAlex',
        id: doi || title,
        title: title.trim(),
        authors,
        authorsList,
        year,
        journal: container.trim(),
        volume,
        issue,
        location: page,
        rawPage,
        publisher: '',
        doi,
        url: itemUrl,
        sourceType,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Identify academic source reference from text snippet.
 * @param {string} text
 * @param {object} [options]
 * @returns {Promise<{ queryUsed: string, results: Array }>}
 */
export async function identifyTextSource(text, options = {}) {
  const { query, phrases } = extractSearchQueries(text);
  if (!query) {
    throw new Error('Please enter or extract text first to search for its source.');
  }

  // Try the primary query
  const searchPromise = Promise.allSettled([
    searchCrossref(query, options.limit || 5),
    searchOpenAlex(query, options.limit || 5),
  ]);

  const [crossrefRes, openalexRes] = await searchPromise;
  const crossrefItems = crossrefRes.status === 'fulfilled' ? crossrefRes.value : [];
  const openalexItems = openalexRes.status === 'fulfilled' ? openalexRes.value : [];

  // Deduplicate results by DOI or normalized title
  const seen = new Set();
  const combined = [];

  for (const item of [...crossrefItems, ...openalexItems]) {
    if (!item.title) continue;
    const key = (item.doi || item.title).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }

  // If no items found and we have alternative phrases, try the second phrase
  if (combined.length === 0 && phrases.length > 1) {
    const fallbackQuery = phrases[1];
    const fallbackResults = await searchCrossref(fallbackQuery, 4);
    for (const item of fallbackResults) {
      if (!item.title) continue;
      const key = (item.doi || item.title).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
    }
  }

  return {
    queryUsed: query,
    results: combined,
  };
}
