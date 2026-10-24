import { describe, it, expect } from 'vitest';
import { extractSearchQueries } from '../src/engine/text-source.js';
import { OCR_LANGUAGES } from '../src/engine/ocr.js';
import { formatImageReferenceRuns, IMAGE_CITATION_STYLES, IMAGE_REF_TYPES } from '../src/engine/captions.js';

describe('OCR & Text Source Identification', () => {
  it('extracts queries from plain text and sentences', () => {
    const raw = 'Artificial Intelligence in Education. A comprehensive survey of recent advances in modern classrooms.';
    const res = extractSearchQueries(raw);
    expect(res.query).toBeDefined();
    expect(res.query.length).toBeGreaterThan(10);
    expect(res.phrases.length).toBeGreaterThan(0);
  });

  it('extracts quoted phrases with highest priority', () => {
    const raw = 'According to Smith, "Deep Residual Learning for Image Recognition" marks an important milestone.';
    const res = extractSearchQueries(raw);
    expect(res.query).toBe('Deep Residual Learning for Image Recognition');
  });

  it('provides OCR supported languages including Arabic and English', () => {
    expect(OCR_LANGUAGES['ara+eng']).toBeDefined();
    expect(OCR_LANGUAGES['ara']).toBeDefined();
    expect(OCR_LANGUAGES['eng']).toBeDefined();
  });

  it('formats image reference runs with page citation in APA', () => {
    const ref = {
      style: 'apa',
      author: 'He, Kaiming; Zhang, Xiangyu',
      year: '2016',
      title: 'Deep Residual Learning for Image Recognition',
      journal: 'IEEE CVPR',
      location: '770-778',
      url: 'https://doi.org/10.1109/cvpr.2016.90',
    };
    const runs = formatImageReferenceRuns(ref);
    const text = runs.map(r => r.text).join('');
    expect(text).toContain('He, K., & Zhang, X.');
    expect(text).toContain('(2016)');
    expect(text).toContain('770');
  });

  it('formats image reference runs in MLA style with page citation', () => {
    const ref = {
      style: 'mla',
      author: 'Smith, John',
      year: '2023',
      title: 'A Study on Modern Typography',
      journal: 'Journal of Design',
      location: 'pp. 45-52',
    };
    const runs = formatImageReferenceRuns(ref);
    const text = runs.map(r => r.text).join('');
    expect(text).toContain('Smith, John.');
    expect(text).toContain('pp. 45–52');
  });

  it('defines academic databases dictionary with selection metadata', async () => {
    const { ACADEMIC_DATABASES } = await import('../src/engine/text-source.js');
    expect(ACADEMIC_DATABASES.all).toBeDefined();
    expect(ACADEMIC_DATABASES.scopus).toBeDefined();
    expect(ACADEMIC_DATABASES.wos).toBeDefined();
    expect(ACADEMIC_DATABASES.pubmed).toBeDefined();
    expect(ACADEMIC_DATABASES.ieee).toBeDefined();
    expect(ACADEMIC_DATABASES.springer).toBeDefined();
    expect(ACADEMIC_DATABASES.elsevier).toBeDefined();
    expect(ACADEMIC_DATABASES.jstor).toBeDefined();
    expect(ACADEMIC_DATABASES.degruyter).toBeDefined();
    expect(ACADEMIC_DATABASES.scholar).toBeDefined();
    expect(ACADEMIC_DATABASES.erihplus).toBeDefined();
    expect(ACADEMIC_DATABASES.abdc).toBeDefined();
    expect(ACADEMIC_DATABASES.chinese).toBeDefined();
    expect(ACADEMIC_DATABASES.arxiv).toBeDefined();
    expect(ACADEMIC_DATABASES.openlibrary).toBeDefined();
    expect(ACADEMIC_DATABASES.scopus.name).toContain('Scopus');
    expect(ACADEMIC_DATABASES.wos.name).toContain('Web of Science');
    expect(ACADEMIC_DATABASES.ieee.name).toContain('IEEE Xplore');
    expect(ACADEMIC_DATABASES.springer.name).toContain('Springer');
    expect(ACADEMIC_DATABASES.elsevier.name).toContain('Elsevier');
  });
});
