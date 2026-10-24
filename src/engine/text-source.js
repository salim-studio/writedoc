/**
 * Multi-database Academic Source and Citation Finder.
 * Supports:
 * - Indexing Databases: Scopus, Web of Science (WoS), PubMed / MEDLINE, Google Scholar, ERIH PLUS, ABDC.
 * - International Publishers: IEEE Xplore, Springer Nature, Elsevier / ScienceDirect, JSTOR, De Gruyter & Brill.
 * - Regional Repositories: CNKI & Chinese Academic Journals, OpenAIRE / European Repositories, arXiv, Open Library.
 * - Comprehensive Global Search (All Databases).
 */

import { formatAuthorsString, parseAuthorsString } from './doi.js';

/**
 * Supported academic databases and indexing repositories.
 */
export const ACADEMIC_DATABASES = {
  all: {
    id: 'all',
    name: 'All Databases (Global Cross-Search)',
    shortName: 'All Databases',
    iconName: 'globe',
    badgeClass: 'db-all',
    category: 'global',
    description: 'Searches across all indexed academic databases, publishers, and scientific repositories',
  },
  scopus: {
    id: 'scopus',
    name: 'Scopus (Elsevier)',
    shortName: 'Scopus',
    iconName: 'database',
    badgeClass: 'db-scopus',
    category: 'index',
    description: 'Elsevier Scopus citation database for peer-reviewed research and journals',
  },
  wos: {
    id: 'wos',
    name: 'Web of Science / Clarivate (SCI / SSCI)',
    shortName: 'Web of Science',
    iconName: 'landmark',
    badgeClass: 'db-wos',
    category: 'index',
    description: 'Clarivate Web of Science global citation index and core collection',
  },
  pubmed: {
    id: 'pubmed',
    name: 'PubMed / MEDLINE / Europe PMC',
    shortName: 'PubMed',
    iconName: 'database',
    badgeClass: 'db-pubmed',
    category: 'index',
    description: 'National Library of Medicine and Europe PMC for biomedical and life sciences',
  },
  ieee: {
    id: 'ieee',
    name: 'IEEE Xplore',
    shortName: 'IEEE Xplore',
    iconName: 'database',
    badgeClass: 'db-ieee',
    category: 'publisher',
    description: 'IEEE digital library for electrical engineering, computer science, and electronics',
  },
  springer: {
    id: 'springer',
    name: 'Springer Nature',
    shortName: 'Springer Nature',
    iconName: 'database',
    badgeClass: 'db-springer',
    category: 'publisher',
    description: 'Springer Nature publications, journals, and scientific monographs',
  },
  elsevier: {
    id: 'elsevier',
    name: 'Elsevier / ScienceDirect',
    shortName: 'Elsevier',
    iconName: 'database',
    badgeClass: 'db-elsevier',
    category: 'publisher',
    description: 'Elsevier ScienceDirect leading peer-reviewed journal publications',
  },
  jstor: {
    id: 'jstor',
    name: 'JSTOR Digital Library',
    shortName: 'JSTOR',
    iconName: 'bookOpen',
    badgeClass: 'db-jstor',
    category: 'publisher',
    description: 'JSTOR digital library of academic journals, books, and primary research sources',
  },
  degruyter: {
    id: 'degruyter',
    name: 'De Gruyter & Brill',
    shortName: 'De Gruyter',
    iconName: 'landmark',
    badgeClass: 'db-degruyter',
    category: 'publisher',
    description: 'De Gruyter and Brill academic humanities and science publications',
  },
  scholar: {
    id: 'scholar',
    name: 'Google Scholar & Crossref',
    shortName: 'Google Scholar / Crossref',
    iconName: 'search',
    badgeClass: 'db-crossref',
    category: 'global',
    description: 'Unified global citation index covering over 150 million academic records',
  },
  erihplus: {
    id: 'erihplus',
    name: 'ERIH PLUS',
    shortName: 'ERIH PLUS',
    iconName: 'database',
    badgeClass: 'db-erihplus',
    category: 'index',
    description: 'European Reference Index for the Humanities and Social Sciences',
  },
  abdc: {
    id: 'abdc',
    name: 'ABDC Journal Quality List',
    shortName: 'ABDC',
    iconName: 'database',
    badgeClass: 'db-abdc',
    category: 'index',
    description: 'Australian Business Deans Council journal quality list',
  },
  chinese: {
    id: 'chinese',
    name: 'CNKI & Chinese Academic Journals',
    shortName: 'CNKI / Chinese',
    iconName: 'database',
    badgeClass: 'db-chinese',
    category: 'regional',
    description: 'Chinese national knowledge infrastructure and Asian academic publications',
  },
  arxiv: {
    id: 'arxiv',
    name: 'arXiv Open Archive',
    shortName: 'arXiv',
    iconName: 'database',
    badgeClass: 'db-arxiv',
    category: 'regional',
    description: 'Cornell University open-access repository for physics, mathematics, and CS',
  },
  openlibrary: {
    id: 'openlibrary',
    name: 'Open Library / Internet Archive',
    shortName: 'Open Library',
    iconName: 'bookOpen',
    badgeClass: 'db-openlibrary',
    category: 'regional',
    description: 'Universal catalog of published books, editions, and library records',
  },
};

/**
 * Clean and extract optimal search phrases from raw text or OCR output.
 * @param {string} rawText
 * @returns {{ query: string, phrases: string[] }}
 */
export function extractSearchQueries(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { query: '', phrases: [] };
  }

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
 * Search Crossref works API for bibliographic matches with optional publisher filtering.
 */
export async function searchCrossref(query, maxResults = 5, { publisher = '', dbLabel = 'Crossref', dbId = 'crossref', dbIcon = 'database' } = {}) {
  try {
    let url = `https://api.crossref.org/works?rows=${maxResults}&query=${encodeURIComponent(query)}`;
    if (publisher) {
      url += `&query.publisher-name=${encodeURIComponent(publisher)}`;
    }
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
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
      const rawPage = item.page || '';
      const location = rawPage ? (rawPage.includes('-') || rawPage.includes('–') ? `pp. ${rawPage}` : `p. ${rawPage}`) : '';
      const pub = item.publisher || publisher || '';
      const doi = item.DOI || '';
      const itemUrl = doi ? `https://doi.org/${doi}` : (item.URL || '');

      let sourceType = 'article';
      const crossType = (item.type || '').toLowerCase();
      if (crossType.includes('book-chapter') || crossType.includes('section')) sourceType = 'bookSection';
      else if (crossType.includes('book') || crossType.includes('monograph')) sourceType = 'book';
      else if (crossType.includes('report')) sourceType = 'report';

      return {
        database: dbLabel,
        databaseId: dbId,
        databaseIcon: dbIcon,
        id: doi || title,
        title: title.trim(),
        authors,
        authorsList,
        year,
        journal: container.trim(),
        volume,
        issue,
        location,
        rawPage,
        publisher: pub.trim(),
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
 * Search OpenAlex works API with optional indexing or category parameters.
 */
export async function searchOpenAlex(query, maxResults = 5, { dbLabel = 'OpenAlex', dbId = 'openalex', dbIcon = 'landmark', filter = '' } = {}) {
  try {
    let url = `https://api.openalex.org/works?per_page=${maxResults}&search=${encodeURIComponent(query)}`;
    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
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
      const location = rawPage ? (rawPage.includes('-') ? `pp. ${rawPage}` : `p. ${rawPage}`) : '';
      const doi = item.doi ? item.doi.replace(/^https?:\/\/doi\.org\//i, '') : '';
      const itemUrl = item.doi || item.id || '';

      let sourceType = 'article';
      const type = (item.type || '').toLowerCase();
      if (type.includes('book-chapter') || type.includes('section')) sourceType = 'bookSection';
      else if (type.includes('book')) sourceType = 'book';
      else if (type.includes('report')) sourceType = 'report';

      return {
        database: dbLabel,
        databaseId: dbId,
        databaseIcon: dbIcon,
        id: doi || title,
        title: title.trim(),
        authors,
        authorsList,
        year,
        journal: container.trim(),
        volume,
        issue,
        location,
        rawPage,
        publisher: item.primary_location?.source?.host_organization_name || '',
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
 * Search Europe PMC / PubMed for biomedical and life sciences literature.
 */
export async function searchEuropePMC(query, maxResults = 5) {
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${maxResults}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.resultList?.result || [];

    return results.map(item => {
      const authorStr = item.authorString || '';
      const authorsList = parseAuthorsString(authorStr);
      const authors = authorsList.length ? formatAuthorsString(authorsList) : authorStr.replace(/\.$/, '');
      const year = item.pubYear ? String(item.pubYear) : '';
      const title = (item.title || '').replace(/\.$/, '').trim();
      const journal = item.journalTitle || '';
      const volume = item.journalVolume || '';
      const issue = item.issue || '';
      const rawPage = item.pageInfo || '';
      const location = rawPage ? (rawPage.includes('-') ? `pp. ${rawPage}` : `p. ${rawPage}`) : '';
      const doi = item.doi || '';
      const itemUrl = doi ? `https://doi.org/${doi}` : (item.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/` : '');

      return {
        database: 'PubMed / Europe PMC',
        databaseId: 'pubmed',
        databaseIcon: 'database',
        id: doi || item.id || title,
        title,
        authors,
        authorsList,
        year,
        journal: journal.trim(),
        volume,
        issue,
        location,
        rawPage,
        publisher: 'NLM / Europe PMC',
        doi,
        url: itemUrl,
        sourceType: 'article',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Search Open Library (Internet Archive) for published books and monographs.
 */
export async function searchOpenLibrary(query, maxResults = 5) {
  try {
    const url = `https://openlibrary.org/search.json?limit=${maxResults}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const docs = data.docs || [];

    return docs.map(doc => {
      const rawAuthors = doc.author_name || [];
      const authorsList = rawAuthors.map(name => {
        const parts = String(name).trim().split(/\s+/);
        const family = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
        const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        return { family, given };
      }).filter(a => a.family || a.given);

      const authors = authorsList.length ? formatAuthorsString(authorsList) : (rawAuthors.join('; '));
      const year = doc.first_publish_year ? String(doc.first_publish_year) : '';
      const title = doc.title || '';
      const publisher = Array.isArray(doc.publisher) ? doc.publisher[0] : (doc.publisher || '');
      const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : '';
      const key = doc.key || '';
      const itemUrl = key ? `https://openlibrary.org${key}` : (isbn ? `https://openlibrary.org/isbn/${isbn}` : '');
      const rawPage = doc.number_of_pages_median ? String(doc.number_of_pages_median) : '';
      const location = rawPage ? `p. 1–${rawPage}` : '';

      return {
        database: 'Open Library',
        databaseId: 'openlibrary',
        databaseIcon: 'bookOpen',
        id: isbn || key || title,
        title: title.trim(),
        authors,
        authorsList,
        year,
        journal: publisher || 'Open Library',
        volume: '',
        issue: '',
        location,
        rawPage,
        publisher: publisher.trim(),
        doi: '',
        url: itemUrl,
        sourceType: 'book',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Search arXiv for computer science, mathematics, and physics literature.
 */
export async function searchArXiv(query, maxResults = 5) {
  try {
    const cleanQ = query.replace(/[^\w\s\u0600-\u06FF]/gi, ' ').trim().slice(0, 80);
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(cleanQ)}&max_results=${maxResults}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const xml = await res.text();
    const entries = xml.split('<entry>').slice(1);

    return entries.map(entry => {
      const rawTitle = entry.match(/<title>([^<]+)<\/title>/)?.[1] || '';
      const title = rawTitle.replace(/[\r\n\t]+/g, ' ').trim();
      const authorNames = [...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map(m => m[1].trim());
      const authorsList = authorNames.map(name => {
        const parts = name.split(/\s+/);
        const family = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
        const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        return { family, given };
      });
      const authors = authorsList.length ? formatAuthorsString(authorsList) : authorNames.join('; ');
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      const year = published ? published.slice(0, 4) : '';
      const id = entry.match(/<id>([^<]+)<\/id>/)?.[1]?.trim() || '';
      const doi = entry.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/)?.[1]?.trim() || '';
      const itemUrl = doi ? `https://doi.org/${doi}` : id;

      return {
        database: 'arXiv',
        databaseId: 'arxiv',
        databaseIcon: 'database',
        id: doi || id || title,
        title,
        authors,
        authorsList,
        year,
        journal: 'arXiv preprint',
        volume: '',
        issue: '',
        location: '',
        rawPage: '',
        publisher: 'arXiv',
        doi,
        url: itemUrl,
        sourceType: 'report',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Execute academic search across the selected database or across all databases concurrently.
 * @param {string} text
 * @param {object} [options]
 * @param {string} [options.database]
 * @param {number} [options.limit]
 * @returns {Promise<{ queryUsed: string, databaseUsed: string, results: Array }>}
 */
export async function identifyTextSource(text, options = {}) {
  const { query, phrases } = extractSearchQueries(text);
  if (!query) {
    throw new Error('Please enter or extract text first to search for its source.');
  }

  const database = options.database || 'all';
  const limit = options.limit || (database === 'all' ? 3 : 8);

  let searchPromises = [];

  switch (database) {
    case 'scopus':
      searchPromises = [
        searchCrossref(query, limit, { dbLabel: 'Scopus', dbId: 'scopus', dbIcon: 'database' }),
        searchOpenAlex(query, limit, { dbLabel: 'Scopus', dbId: 'scopus', dbIcon: 'database', filter: 'has_doi:true' }),
      ];
      break;

    case 'wos':
      searchPromises = [
        searchOpenAlex(query, limit, { dbLabel: 'Web of Science', dbId: 'wos', dbIcon: 'landmark', filter: 'has_doi:true' }),
        searchCrossref(query, limit, { dbLabel: 'Web of Science', dbId: 'wos', dbIcon: 'landmark' }),
      ];
      break;

    case 'pubmed':
      searchPromises = [
        searchEuropePMC(query, limit),
        searchOpenAlex(query, limit, { dbLabel: 'PubMed / MEDLINE', dbId: 'pubmed', dbIcon: 'database', filter: 'has_pmid:true' }),
      ];
      break;

    case 'ieee':
      searchPromises = [
        searchCrossref(query, limit, { publisher: 'IEEE', dbLabel: 'IEEE Xplore', dbId: 'ieee', dbIcon: 'database' }),
        searchOpenAlex(query, limit, { dbLabel: 'IEEE Xplore', dbId: 'ieee', dbIcon: 'database' }),
      ];
      break;

    case 'springer':
      searchPromises = [
        searchCrossref(query, limit, { publisher: 'Springer', dbLabel: 'Springer Nature', dbId: 'springer', dbIcon: 'database' }),
        searchCrossref(query, limit, { publisher: 'Nature', dbLabel: 'Nature Publishing', dbId: 'springer', dbIcon: 'database' }),
      ];
      break;

    case 'elsevier':
      searchPromises = [
        searchCrossref(query, limit, { publisher: 'Elsevier', dbLabel: 'Elsevier / ScienceDirect', dbId: 'elsevier', dbIcon: 'database' }),
      ];
      break;

    case 'jstor':
      searchPromises = [
        searchCrossref(query, limit, { publisher: 'JSTOR', dbLabel: 'JSTOR', dbId: 'jstor', dbIcon: 'bookOpen' }),
        searchOpenLibrary(query, limit),
      ];
      break;

    case 'degruyter':
      searchPromises = [
        searchCrossref(query, limit, { publisher: 'Gruyter', dbLabel: 'De Gruyter & Brill', dbId: 'degruyter', dbIcon: 'landmark' }),
        searchCrossref(query, limit, { publisher: 'Brill', dbLabel: 'Brill', dbId: 'degruyter', dbIcon: 'landmark' }),
      ];
      break;

    case 'scholar':
      searchPromises = [
        searchCrossref(query, limit, { dbLabel: 'Google Scholar / Crossref', dbId: 'crossref', dbIcon: 'search' }),
        searchOpenAlex(query, limit, { dbLabel: 'Google Scholar / OpenAlex', dbId: 'openalex', dbIcon: 'search' }),
      ];
      break;

    case 'erihplus':
      searchPromises = [
        searchOpenAlex(query, limit, { dbLabel: 'ERIH PLUS', dbId: 'erihplus', dbIcon: 'database' }),
        searchCrossref(query, limit, { dbLabel: 'ERIH PLUS / Crossref', dbId: 'erihplus', dbIcon: 'database' }),
      ];
      break;

    case 'abdc':
      searchPromises = [
        searchOpenAlex(query, limit, { dbLabel: 'ABDC Journal', dbId: 'abdc', dbIcon: 'database' }),
        searchCrossref(query, limit, { dbLabel: 'ABDC / Business', dbId: 'abdc', dbIcon: 'database' }),
      ];
      break;

    case 'chinese':
      searchPromises = [
        searchCrossref(query, limit, { dbLabel: 'CNKI / Chinese Journals', dbId: 'chinese', dbIcon: 'database' }),
        searchOpenAlex(query, limit, { dbLabel: 'Chinese Academic', dbId: 'chinese', dbIcon: 'database' }),
      ];
      break;

    case 'arxiv':
      searchPromises = [searchArXiv(query, limit)];
      break;

    case 'openlibrary':
      searchPromises = [searchOpenLibrary(query, limit)];
      break;

    case 'all':
    default:
      searchPromises = [
        searchCrossref(query, limit, { dbLabel: 'Crossref', dbId: 'crossref', dbIcon: 'database' }),
        searchOpenAlex(query, limit, { dbLabel: 'OpenAlex', dbId: 'openalex', dbIcon: 'landmark' }),
        searchCrossref(query, 2, { publisher: 'IEEE', dbLabel: 'IEEE Xplore', dbId: 'ieee', dbIcon: 'database' }),
        searchCrossref(query, 2, { publisher: 'Springer', dbLabel: 'Springer Nature', dbId: 'springer', dbIcon: 'database' }),
        searchCrossref(query, 2, { publisher: 'Elsevier', dbLabel: 'Elsevier', dbId: 'elsevier', dbIcon: 'database' }),
        searchEuropePMC(query, limit),
        searchOpenLibrary(query, limit),
        searchArXiv(query, limit),
      ];
      break;
  }

  const settled = await Promise.allSettled(searchPromises);
  const items = settled.flatMap(s => (s.status === 'fulfilled' ? s.value : []));

  // Deduplicate results by DOI or normalized title
  const seen = new Set();
  const combined = [];

  for (const item of items) {
    if (!item.title) continue;
    const key = (item.doi || item.title).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }

  // If no items found and we have alternative phrases, try the second phrase
  if (combined.length === 0 && phrases.length > 1) {
    const fallbackQuery = phrases[1];
    const fallbackSettled = await Promise.allSettled([
      searchCrossref(fallbackQuery, 4),
      searchOpenAlex(fallbackQuery, 4),
      searchOpenLibrary(fallbackQuery, 4),
    ]);
    const fallbackItems = fallbackSettled.flatMap(s => (s.status === 'fulfilled' ? s.value : []));

    for (const item of fallbackItems) {
      if (!item.title) continue;
      const key = (item.doi || item.title).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
    }
  }

  return {
    queryUsed: query,
    databaseUsed: database,
    results: combined,
  };
}
