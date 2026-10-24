import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  latexToLinear,
  linearToLatex,
  latexToOmml,
  ommlToLatex,
  extractLatexExpressions,
  LATEX_CATEGORIES,
  LATEX_TEMPLATES
} from '../src/engine/latex.js';

let dom;
beforeAll(() => {
  dom = new JSDOM();
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
});
afterAll(() => dom.window.close());

describe('LaTeX writing engine', () => {
  it('translates fractions and radicals', () => {
    const quad = 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    const linear = latexToLinear(quad);
    expect(linear).toContain('√');
    expect(linear).toContain('±');
    const omml = latexToOmml(quad);
    expect(omml).toContain('<m:f>');
    expect(omml).toContain('<m:rad>');
  });

  it('translates matrix environments (pmatrix, bmatrix, vmatrix, cases)', () => {
    const pmatrix = '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}';
    const pLinear = latexToLinear(pmatrix);
    expect(pLinear).toBe('(■(a&b@c&d))');
    const pOmml = latexToOmml(pmatrix);
    expect(pOmml).toContain('<m:m>');
    expect(pOmml).toContain('<m:mr>');

    const bmatrix = '\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}';
    expect(latexToLinear(bmatrix)).toBe('[■(1&0@0&1)]');

    const vmatrix = '\\begin{vmatrix} x & y \\\\ z & w \\end{vmatrix}';
    expect(latexToLinear(vmatrix)).toBe('|■(x&y@z&w)|');

    const cases = '\\begin{cases} x & \\text{if } x > 0 \\\\ -x & \\text{if } x \\leq 0 \\end{cases}';
    const casesLinear = latexToLinear(cases);
    expect(casesLinear).toContain('█');
  });

  it('translates blackboard bold and calligraphic symbols', () => {
    expect(latexToLinear('\\mathbb{R}')).toBe('ℝ');
    expect(latexToLinear('\\mathbb{C}')).toBe('ℂ');
    expect(latexToLinear('\\mathbb{N}')).toBe('ℕ');
    expect(latexToLinear('\\mathbb{Z}')).toBe('ℤ');
    expect(latexToLinear('\\mathcal{L}')).toBe('ℒ');
    expect(latexToLinear('\\mathcal{H}')).toBe('ℋ');
  });

  it('translates calculus operators (integrals, summations, limits)', () => {
    const sum = '\\sum_{i=1}^{n} \\frac{1}{i^2}';
    const sumOmml = latexToOmml(sum);
    expect(sumOmml).toContain('<m:nary>');

    const integral = '\\int_{0}^{\\infty} e^{-x^2} \\, dx';
    const intLinear = latexToLinear(integral);
    expect(intLinear).toContain('∫');
    expect(intLinear).toContain('∞');
  });

  it('translates delimiters and removes \\left and \\right', () => {
    const expr = '\\left( \\frac{a}{b} \\right) + \\left[ x \\right] + \\left\\{ y \\right\\}';
    const linear = latexToLinear(expr);
    expect(linear).not.toContain('\\left');
    expect(linear).not.toContain('\\right');
  });

  it('converts linear and OMML back to clean LaTeX', () => {
    const matrixLinear = '(■(a&b@c&d))';
    const tex = linearToLatex(matrixLinear);
    expect(tex).toContain('\\begin{pmatrix}');
    expect(tex).toContain('\\end{pmatrix}');
    expect(tex).toContain('&');
    expect(tex).toContain('\\\\');

    const omml = latexToOmml('x^2 + y^2 = z^2');
    const backTex = ommlToLatex(omml);
    expect(backTex).toContain('x');
    expect(backTex).toContain('y');
    expect(backTex).toContain('z');
  });

  it('extracts inline and display LaTeX from plain text', () => {
    const text = 'Consider $E = mc^2$ and the integral $$\\int_0^1 f(x)dx = 1$$ in paper.';
    const matches = extractLatexExpressions(text);
    expect(matches).toHaveLength(2);
    expect(matches[0].latex).toBe('E = mc^2');
    expect(matches[0].display).toBe(false);
    expect(matches[1].latex).toBe('\\int_0^1 f(x)dx = 1');
    expect(matches[1].display).toBe(true);
  });

  it('contains comprehensive palettes and scientific templates', () => {
    expect(LATEX_CATEGORIES.length).toBeGreaterThanOrEqual(6);
    expect(LATEX_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    for (const tpl of LATEX_TEMPLATES) {
      expect(tpl.latex).toBeTruthy();
      expect(latexToOmml(tpl.latex)).toBeTruthy();
    }
  });
});
