/**
 * LaTeX Equation & Scientific Writing Engine for WriteDoc.
 * Provides high-fidelity translation between LaTeX mathematical markup,
 * UnicodeMath linear representation, and native Office Math (OMML).
 */
import { linearToOmml, ommlToLinear } from './math-linear.js';
import { ommlToMathml } from './omml-mathml.js';

// Blackboard bold unicode mapping
export const BLACKBOARD_MAP = {
  A: '𝔸', B: '𝔹', C: 'ℂ', D: '𝔻', E: '𝔼', F: '𝔽', G: '𝔾', H: 'ℍ', I: '𝕀', J: '𝕁',
  K: '𝕂', L: '𝕃', M: '𝕄', N: 'ℕ', O: '𝕆', P: 'ℙ', Q: 'ℚ', R: 'ℝ', S: '𝕊', T: '𝕋',
  U: '𝕌', V: '𝕍', W: '𝕎', X: '𝕏', Y: '𝕐', Z: 'ℤ',
  a: '𝕒', b: '𝕓', c: '𝕔', d: '𝕕', e: '𝕖', f: '𝕗', g: '𝕘', h: '𝕙', i: '𝕚', j: '𝕛',
  k: '𝕜', l: '𝕝', m: '𝕞', n: '𝕟', o: '𝕠', p: '𝕡', q: '𝕢', r: '𝕣', s: '𝕤', t: '𝕥',
  u: '𝕦', v: '𝕧', w: '𝕨', x: '𝕩', y: '𝕪', z: '𝕫',
  '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡',
};

// Script / Calligraphic unicode mapping
export const CALLIGRAPHIC_MAP = {
  A: '𝒜', B: 'ℬ', C: '𝒞', D: '𝒟', E: 'ℰ', F: 'ℱ', G: '𝒢', H: 'ℋ', I: 'ℐ', J: '𝒥',
  K: '𝒦', L: 'ℒ', M: 'ℳ', N: '𝒩', O: '𝒪', P: '𝒫', Q: '𝒬', R: 'ℛ', S: '𝒮', T: '𝒯',
  U: '𝒰', V: '𝒱', W: '𝒲', X: '𝒳', Y: '𝒴', Z: '𝒵',
  a: '𝒶', b: '𝒷', c: '𝒸', d: '𝒹', e: 'ℯ', f: '𝒻', g: 'ℊ', h: '𝒽', i: '𝒾', j: '𝒿',
  k: '𝓀', l: '𝓁', m: '𝓂', n: '𝓃', o: 'ℴ', p: '𝓅', q: '𝓆', r: '𝓇', s: '𝓈', t: '𝓉',
  u: '𝓊', v: '𝓋', w: '𝓌', x: '𝓍', y: '𝓎', z: '𝓏',
};

// Mathematical Fraktur
export const FRAKTUR_MAP = {
  A: '𝔄', B: '𝔅', C: 'ℭ', D: '𝔇', E: '𝔈', F: '𝔉', G: '𝔊', H: 'ℌ', I: 'ℑ', J: '𝔍',
  K: '𝔎', L: '𝔏', M: '𝔐', N: '𝔑', O: '𝔒', P: '𝔓', Q: '𝔔', R: 'ℜ', S: '𝔖', T: '𝔗',
  U: '𝔘', V: '𝔙', W: '𝔚', X: '𝔛', Y: '𝔜', Z: 'ℨ',
  a: '𝔞', b: '𝔟', c: '𝔠', d: '𝔡', e: '𝔢', f: '𝔣', g: '𝔤', h: '𝔥', i: '𝔦', j: '𝔧',
  k: '𝔨', l: '𝔩', m: '𝔪', n: '𝔫', o: '𝔬', p: '𝔭', q: '𝔮', r: '𝔯', s: '𝔰', t: '𝔱',
  u: '𝔲', v: '𝔳', w: '𝔴', x: '𝔵', y: '𝔶', z: '𝔷',
};

/**
 * Translates LaTeX environments into UnicodeMath matrix and alignment structures.
 * Supports: matrix, pmatrix, bmatrix, Bmatrix, vmatrix, Vmatrix, cases, aligned, array.
 */
function translateEnvironments(tex) {
  let res = tex;
  const envRegex = /\\begin\{(matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|cases|aligned|array)\}([\s\S]*?)\\end\{\1\}/;
  
  // Recursively process inner environments first
  let loopCount = 0;
  while (envRegex.test(res) && loopCount++ < 20) {
    res = res.replace(envRegex, (_, env, inner) => {
      let body = inner.trim();
      // Handle array column specifications e.g. {cc} or {l|r}
      if (env === 'array' && body.startsWith('{')) {
        const closeIdx = body.indexOf('}');
        if (closeIdx !== -1) body = body.slice(closeIdx + 1).trim();
      }

      // Convert rows (\\ or \\[...]) to @
      const rawRows = body.split(/\\\\(?:\s*\[[^\]]*\])?/);
      const rows = rawRows.map(r => r.trim()).filter(r => r.length > 0);
      const matrixContent = rows.map(r => {
        return r.split('&').map(cell => cell.trim()).join('&');
      }).join('@');

      switch (env) {
        case 'matrix': return `■(${matrixContent})`;
        case 'pmatrix': return `(■(${matrixContent}))`;
        case 'bmatrix': return `[■(${matrixContent})]`;
        case 'Bmatrix': return `{■(${matrixContent})}`;
        case 'vmatrix': return `|■(${matrixContent})|`;
        case 'Vmatrix': return `‖■(${matrixContent})‖`;
        case 'cases': return `{\\█(${matrixContent})}`;
        case 'aligned': return `█(${matrixContent})`;
        case 'array': return `■(${matrixContent})`;
        default: return `■(${matrixContent})`;
      }
    });
  }
  return res;
}

/**
 * Converts a standard LaTeX math string into linear UnicodeMath format
 * accepted by the Office Math builder.
 */
export function latexToLinear(latex) {
  if (!latex || typeof latex !== 'string') return '';
  let s = latex.trim();

  // Strip Markdown code block wrappers
  s = s.replace(/^```(?:latex|tex)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Strip enclosing math delimiters
  if (s.startsWith('$$') && s.endsWith('$$') && s.length >= 4) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith('\\[') && s.endsWith('\\]') && s.length >= 4) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith('\\(') && s.endsWith('\\)') && s.length >= 4) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith('$') && s.endsWith('$') && s.length >= 2) {
    s = s.slice(1, -1).trim();
  }

  // Strip equation environment wrappers
  s = s.replace(/\\begin\{(?:equation|equation\*|align|align\*|gather|gather\*)\}([\s\S]*?)\\end\{(?:equation|equation\*|align|align\*|gather|gather\*)\}/g, '$1').trim();

  // Strip comments (% ...)
  s = s.replace(/(^|[^\\])%.*$/gm, '$1');

  // Convert environments (pmatrix, bmatrix, cases, etc.)
  s = translateEnvironments(s);

  // Normalize blackboard bold: \mathbb{R} -> ℝ
  s = s.replace(/\\mathbb\{([A-Za-z0-9])\}/g, (_, ch) => BLACKBOARD_MAP[ch] || ch);
  // Normalize calligraphic: \mathcal{L} -> ℒ
  s = s.replace(/\\mathcal\{([A-Za-z])\}/g, (_, ch) => CALLIGRAPHIC_MAP[ch] || ch);
  // Normalize fraktur: \mathfrak{g} -> 𝔤
  s = s.replace(/\\mathfrak\{([A-Za-z])\}/g, (_, ch) => FRAKTUR_MAP[ch] || ch);

  // Convert text commands: \text{...}, \mathrm{...}, \operatorname{...}
  // Ensure spaces in \text{...} are converted to quoted linear strings
  s = s.replace(/\\text\{([^}]+)\}/g, (_, txt) => `"${txt}"`);
  s = s.replace(/\\mathrm\{([^}]+)\}/g, (_, txt) => `"${txt}"`);

  // Delimiters \left and \right
  s = s.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');
  s = s.replace(/\\left\{/g, '{').replace(/\\right\}/g, '}');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\|/g, '|').replace(/\\right\|/g, '|');
  s = s.replace(/\\left\\vert/g, '|').replace(/\\right\\vert/g, '|');
  s = s.replace(/\\left\\Vert/g, '‖').replace(/\\right\\Vert/g, '‖');
  s = s.replace(/\\left\./g, '').replace(/\\right\./g, '');
  s = s.replace(/\\left\s*([(\[{|])/g, '$1').replace(/\\right\s*([)\]}|])/g, '$1');

  // Spacing
  s = s.replace(/\\quad/g, '  ').replace(/\\qquad/g, '    ');
  s = s.replace(/\\,|\\;|\\:|\\!|\\enspace/g, ' ');
  s = s.replace(/~/g, ' ');

  // Limits
  s = s.replace(/\\limits/g, '').replace(/\\nolimits/g, '');

  // Fractions variations
  s = s.replace(/\\(?:dfrac|tfrac|cfrac)/g, '\\frac');

  // Multi-integral and calculus operators
  s = s.replace(/\\iiint(?![a-zA-Z])/g, '∭').replace(/\\iint(?![a-zA-Z])/g, '∬').replace(/\\oint(?![a-zA-Z])/g, '∮');
  s = s.replace(/\\int(?![a-zA-Z])/g, '∫');
  s = s.replace(/\\sum(?![a-zA-Z])/g, '∑');
  s = s.replace(/\\prod(?![a-zA-Z])/g, '∏');
  s = s.replace(/\\coprod(?![a-zA-Z])/g, '∐');

  // Convert roots without optional degree: \sqrt{...} -> √( ... )
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // Inequalities and relations variants
  s = s.replace(/\\le(?![a-zA-Z])/g, '≤').replace(/\\ge(?![a-zA-Z])/g, '≥');
  s = s.replace(/\\ne(?![a-zA-Z])/g, '≠').replace(/\\neq(?![a-zA-Z])/g, '≠');
  s = s.replace(/\\pm(?![a-zA-Z])/g, '±').replace(/\\mp(?![a-zA-Z])/g, '∓');
  s = s.replace(/\\times(?![a-zA-Z])/g, '×').replace(/\\cdot(?![a-zA-Z])/g, '⋅').replace(/\\div(?![a-zA-Z])/g, '÷');
  s = s.replace(/\\to(?![a-zA-Z])/g, '→').replace(/\\gets(?![a-zA-Z])/g, '←');
  s = s.replace(/\\implies(?![a-zA-Z])/g, '⇒').replace(/\\iff(?![a-zA-Z])/g, '⇔');
  s = s.replace(/\\infty(?![a-zA-Z])/g, '∞').replace(/\\partial(?![a-zA-Z])/g, '∂');
  s = s.replace(/\\nabla(?![a-zA-Z])/g, '∇').replace(/\\hbar(?![a-zA-Z])/g, 'ℏ');

  return s.trim();
}

/**
 * Converts a linear UnicodeMath equation back into clean, readable LaTeX markup.
 */
export function linearToLatex(linear) {
  if (!linear || typeof linear !== 'string') return '';
  let s = linear.trim();

  // Convert matrices: (■(...)) -> \begin{pmatrix} ... \end{pmatrix}
  s = s.replace(/\(\s*■\(([\s\S]*?)\)\s*\)/g, (_, body) => {
    const texRows = body.split('@').map(r => r.split('&').map(c => c.trim()).join(' & ')).join(' \\\\\n  ');
    return `\\begin{pmatrix}\n  ${texRows}\n\\end{pmatrix}`;
  });

  // [■(...)] -> \begin{bmatrix} ... \end{bmatrix}
  s = s.replace(/\[\s*■\(([\s\S]*?)\)\s*\]/g, (_, body) => {
    const texRows = body.split('@').map(r => r.split('&').map(c => c.trim()).join(' & ')).join(' \\\\\n  ');
    return `\\begin{bmatrix}\n  ${texRows}\n\\end{bmatrix}`;
  });

  // |■(...)| -> \begin{vmatrix} ... \end{vmatrix}
  s = s.replace(/\|\s*■\(([\s\S]*?)\)\s*\|/g, (_, body) => {
    const texRows = body.split('@').map(r => r.split('&').map(c => c.trim()).join(' & ')).join(' \\\\\n  ');
    return `\\begin{vmatrix}\n  ${texRows}\n\\end{vmatrix}`;
  });

  // cases: {\█(...)} or {\█(...)┤
  s = s.replace(/\{\s*\\?█\(([\s\S]*?)\)\s*(?:┤|\})?/g, (_, body) => {
    const texRows = body.split('@').map(r => r.split('&').map(c => c.trim()).join(' & ')).join(' \\\\\n  ');
    return `\\begin{cases}\n  ${texRows}\n\\end{cases}`;
  });

  // Symbols to LaTeX
  const REVERSE_SYMBOLS = {
    'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ', 'ϵ': '\\epsilon ', 'ε': '\\varepsilon ',
    'ζ': '\\zeta ', 'η': '\\eta ', 'θ': '\\theta ', 'ϑ': '\\vartheta ', 'ι': '\\iota ', 'κ': '\\kappa ',
    'λ': '\\lambda ', 'μ': '\\mu ', 'ν': '\\nu ', 'ξ': '\\xi ', 'π': '\\pi ', 'ϖ': '\\varpi ',
    'ρ': '\\rho ', 'ϱ': '\\varrho ', 'σ': '\\sigma ', 'ς': '\\varsigma ', 'τ': '\\tau ', 'υ': '\\upsilon ',
    'ϕ': '\\phi ', 'φ': '\\varphi ', 'χ': '\\chi ', 'ψ': '\\psi ', 'ω': '\\omega ',
    'Γ': '\\Gamma ', 'Δ': '\\Delta ', 'Θ': '\\Theta ', 'Λ': '\\Lambda ', 'Ξ': '\\Xi ', 'Π': '\\Pi ',
    'Σ': '\\Sigma ', 'Υ': '\\Upsilon ', 'Φ': '\\Phi ', 'Ψ': '\\Psi ', 'Ω': '\\Omega ',
    '∑': '\\sum ', '∏': '\\prod ', '∫': '\\int ', '∬': '\\iint ', '∭': '\\iiint ', '∮': '\\oint ',
    '∞': '\\infty ', '∂': '\\partial ', '∇': '\\nabla ', 'ℏ': '\\hbar ', 'ℓ': '\\ell ', '∅': '\\emptyset ',
    '≤': ' \\leq ', '≥': ' \\geq ', '≠': ' \\neq ', '≈': ' \\approx ', '≡': ' \\equiv ', '∝': ' \\propto ',
    '±': ' \\pm ', '∓': ' \\mp ', '×': ' \\times ', '⋅': ' \\cdot ', '÷': ' \\div ',
    '→': ' \\to ', '←': ' \\gets ', '⇒': ' \\implies ', '⇐': ' \\Leftarrow ', '⇔': ' \\iff ', '↦': ' \\mapsto ',
    '∈': ' \\in ', '∉': ' \\notin ', '⊂': ' \\subset ', '⊆': ' \\subseteq ', '⊃': ' \\supset ', '⊇': ' \\supseteq ',
    '∪': ' \\cup ', '∩': ' \\cap ', '∖': ' \\setminus ', '∧': ' \\land ', '∨': ' \\lor ', '¬': ' \\neg ',
    '∀': ' \\forall ', '∃': ' \\exists ', '⊥': ' \\perp ', '∥': ' \\parallel ',
    '…': ' \\dots ', '⋯': ' \\cdots ', '⋮': ' \\vdots ', '⋱': ' \\ddots ',
  };

  for (const [sym, tex] of Object.entries(REVERSE_SYMBOLS)) {
    s = s.replaceAll(sym, tex);
  }

  // Convert roots: √(n&x) -> \sqrt[n]{x}, √(x) -> \sqrt{x}
  s = s.replace(/√\(([^&]+)&([^)]+)\)/g, '\\sqrt[$1]{$2}');
  s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/√([A-Za-z0-9])/g, '\\sqrt{$1}');

  // Convert sub/sup with parentheses or simple operands to braces: x_(i=1) -> x_{i=1}, x^(n+1) -> x^{n+1}
  s = s.replace(/\_\(([^)]+)\)/g, '_{$1}');
  s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Builds Office Math (OMML) directly from a LaTeX formula string.
 */
export function latexToOmml(latex, { display = false } = {}) {
  const linear = latexToLinear(latex);
  return linearToOmml(linear, { display });
}

/**
 * Converts Office Math (OMML) XML back to clean LaTeX code.
 */
export function ommlToLatex(ommlXml) {
  const linear = ommlToLinear(ommlXml);
  return linearToLatex(linear);
}

/**
 * Previews LaTeX directly as HTML MathML Core markup.
 */
export function latexToMathml(latex, { display = false } = {}) {
  const omml = latexToOmml(latex, { display });
  return ommlToMathml(omml, { display });
}

/**
 * Comprehensive categorization of LaTeX tools and symbols for the interactive palette.
 */
export const LATEX_CATEGORIES = [
  {
    id: 'structures',
    name: 'Structures & Basics',
    nameEn: 'Structures & Basics',
    icon: '∛',
    items: [
      { label: 'Simple Fraction', snippet: '\\frac{a}{b}', preview: 'a/b', desc: 'Standard fraction' },
      { label: 'Display Fraction', snippet: '\\dfrac{a}{b}', preview: 'a/b', desc: 'Full-size display fraction' },
      { label: 'Square Root', snippet: '\\sqrt{x}', preview: '√x', desc: 'Square root' },
      { label: 'Nth Root', snippet: '\\sqrt[n]{x}', preview: 'ⁿ√x', desc: 'N-th order root' },
      { label: 'Superscript', snippet: 'x^{n}', preview: 'xⁿ', desc: 'Power and exponent' },
      { label: 'Subscript', snippet: 'x_{i}', preview: 'xᵢ', desc: 'Subscript index' },
      { label: 'Sub/Superscript', snippet: 'x_{i}^{n}', preview: 'xᵢⁿ', desc: 'Subscript and superscript combined' },
      { label: 'Binomial', snippet: '\\binom{n}{k}', preview: '(ⁿₖ)', desc: 'Binomial coefficient' },
      { label: 'Parentheses', snippet: '\\left( x \\right)', preview: '(x)', desc: 'Auto-sizing round parentheses' },
      { label: 'Brackets', snippet: '\\left[ x \\right]', preview: '[x]', desc: 'Auto-sizing square brackets' },
      { label: 'Braces', snippet: '\\left\\{ x \\right\\}', preview: '{x}', desc: 'Auto-sizing curly braces' },
      { label: 'Absolute Value', snippet: '\\left| x \\right|', preview: '|x|', desc: 'Absolute value or modulus' },
      { label: 'Norm', snippet: '\\left\\| \\mathbf{v} \\right\\|', preview: '‖v‖', desc: 'Vector norm' },
      { label: 'Angle Brackets', snippet: '\\left\\langle x \\right\\rangle', preview: '⟨x⟩', desc: 'Angle brackets / Dirac notation' },
    ],
  },
  {
    id: 'calculus',
    name: 'Calculus & Sums',
    nameEn: 'Calculus & Sums',
    icon: '∫',
    items: [
      { label: 'Definite Integral', snippet: '\\int_{a}^{b} f(x) \\, dx', preview: '∫ₐᵇ', desc: 'Definite integral from a to b' },
      { label: 'Indefinite Integral', snippet: '\\int f(x) \\, dx', preview: '∫', desc: 'Indefinite integral' },
      { label: 'Double Integral', snippet: '\\iint_{D} f(x, y) \\, dx dy', preview: '∬', desc: 'Double integral over region D' },
      { label: 'Triple Integral', snippet: '\\iiint_{V} f(x, y, z) \\, dV', preview: '∭', desc: 'Volume triple integral' },
      { label: 'Contour Integral', snippet: '\\oint_{C} \\mathbf{F} \\cdot d\\mathbf{r}', preview: '∮', desc: 'Closed line integral' },
      { label: 'Sum', snippet: '\\sum_{i=1}^{n} a_i', preview: '∑', desc: 'Summation from 1 to n' },
      { label: 'Infinite Series', snippet: '\\sum_{n=0}^{\\infty} a_n x^n', preview: '∑^∞', desc: 'Infinite power series' },
      { label: 'Product', snippet: '\\prod_{i=1}^{n} x_i', preview: '∏', desc: 'N-ary product' },
      { label: 'Limit', snippet: '\\lim_{x \\to 0} \\frac{\\sin x}{x}', preview: 'lim', desc: 'Limit as x approaches zero' },
      { label: 'Limit to Infinity', snippet: '\\lim_{n \\to \\infty} a_n', preview: 'lim→∞', desc: 'Limit as n approaches infinity' },
      { label: 'First Derivative', snippet: '\\frac{df}{dx}', preview: 'df/dx', desc: 'Ordinary first derivative' },
      { label: 'Second Derivative', snippet: '\\frac{d^2 y}{dx^2}', preview: 'd²y/dx²', desc: 'Ordinary second derivative' },
      { label: 'Partial Derivative', snippet: '\\frac{\\partial f}{\\partial x}', preview: '∂f/∂x', desc: 'Partial derivative with respect to x' },
      { label: 'Second Partial', snippet: '\\frac{\\partial^2 f}{\\partial x^2}', preview: '∂²f/∂x²', desc: 'Second order partial derivative' },
      { label: 'Gradient', snippet: '\\nabla f', preview: '∇f', desc: 'Del gradient operator' },
      { label: 'Divergence', snippet: '\\nabla \\cdot \\mathbf{v}', preview: '∇·v', desc: 'Vector field divergence' },
      { label: 'Curl', snippet: '\\nabla \\times \\mathbf{v}', preview: '∇×v', desc: 'Vector field curl' },
      { label: 'Laplacian', snippet: '\\Delta f', preview: 'Δf', desc: 'Laplace operator' },
    ],
  },
  {
    id: 'matrices',
    name: 'Matrices & Cases',
    nameEn: 'Matrices & Cases',
    icon: '▦',
    items: [
      { label: '2×2 Matrix (Parentheses)', snippet: '\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}', preview: '( 2×2 )', desc: 'Round bracket 2x2 matrix' },
      { label: '2×2 Matrix (Brackets)', snippet: '\\begin{bmatrix}\n  a & b \\\\\n  c & d\n\\end{bmatrix}', preview: '[ 2×2 ]', desc: 'Square bracket 2x2 matrix' },
      { label: 'Determinant', snippet: '\\begin{vmatrix}\n  a & b \\\\\n  c & d\n\\end{vmatrix}', preview: '| 2×2 |', desc: '2x2 determinant' },
      { label: '3×3 Matrix', snippet: '\\begin{pmatrix}\n  a & b & c \\\\\n  d & e & f \\\\\n  g & h & i\n\\end{pmatrix}', preview: '( 3×3 )', desc: '3x3 matrix' },
      { label: 'Piecewise Cases', snippet: '\\begin{cases}\n  x & \\text{if } x > 0 \\\\\n  -x & \\text{if } x \\leq 0\n\\end{cases}', preview: '{ cases', desc: 'Piecewise defined function' },
      { label: 'Aligned Equations', snippet: '\\begin{aligned}\n  a &= b + c \\\\\n  &= d + e\n\\end{aligned}', preview: 'aligned', desc: 'Vertically aligned equations' },
      { label: 'Identity Matrix', snippet: '\\mathbf{I} = \\begin{pmatrix}\n  1 & 0 \\\\\n  0 & 1\n\\end{pmatrix}', preview: 'I₂', desc: '2x2 Identity matrix' },
      { label: 'Column Vector', snippet: '\\begin{pmatrix}\n  x \\\\\n  y \\\\\n  z\n\\end{pmatrix}', preview: '( 3×1 )', desc: '3D column vector' },
    ],
  },
  {
    id: 'greek',
    name: 'Greek Letters',
    nameEn: 'Greek Letters',
    icon: 'Ω',
    items: [
      { label: 'alpha', snippet: '\\alpha', preview: 'α' },
      { label: 'beta', snippet: '\\beta', preview: 'β' },
      { label: 'gamma', snippet: '\\gamma', preview: 'γ' },
      { label: 'delta', snippet: '\\delta', preview: 'δ' },
      { label: 'epsilon', snippet: '\\epsilon', preview: 'ϵ' },
      { label: 'varepsilon', snippet: '\\varepsilon', preview: 'ε' },
      { label: 'zeta', snippet: '\\zeta', preview: 'ζ' },
      { label: 'eta', snippet: '\\eta', preview: 'η' },
      { label: 'theta', snippet: '\\theta', preview: 'θ' },
      { label: 'lambda', snippet: '\\lambda', preview: 'λ' },
      { label: 'mu', snippet: '\\mu', preview: 'μ' },
      { label: 'nu', snippet: '\\nu', preview: 'ν' },
      { label: 'xi', snippet: '\\xi', preview: 'ξ' },
      { label: 'pi', snippet: '\\pi', preview: 'π' },
      { label: 'rho', snippet: '\\rho', preview: 'ρ' },
      { label: 'sigma', snippet: '\\sigma', preview: 'σ' },
      { label: 'tau', snippet: '\\tau', preview: 'τ' },
      { label: 'phi', snippet: '\\phi', preview: 'ϕ' },
      { label: 'varphi', snippet: '\\varphi', preview: 'φ' },
      { label: 'chi', snippet: '\\chi', preview: 'χ' },
      { label: 'psi', snippet: '\\psi', preview: 'ψ' },
      { label: 'omega', snippet: '\\omega', preview: 'ω' },
      { label: 'Gamma', snippet: '\\Gamma', preview: 'Γ' },
      { label: 'Delta', snippet: '\\Delta', preview: 'Δ' },
      { label: 'Theta', snippet: '\\Theta', preview: 'Θ' },
      { label: 'Lambda', snippet: '\\Lambda', preview: 'Λ' },
      { label: 'Xi', snippet: '\\Xi', preview: 'Ξ' },
      { label: 'Pi', snippet: '\\Pi', preview: 'Π' },
      { label: 'Sigma', snippet: '\\Sigma', preview: 'Σ' },
      { label: 'Phi', snippet: '\\Phi', preview: 'Φ' },
      { label: 'Psi', snippet: '\\Psi', preview: 'Ψ' },
      { label: 'Omega', snippet: '\\Omega', preview: 'Ω' },
    ],
  },
  {
    id: 'relations',
    name: 'Operators & Arrows',
    nameEn: 'Operators & Arrows',
    icon: '⇄',
    items: [
      { label: 'Less than or Equal', snippet: '\\leq', preview: '≤' },
      { label: 'Greater than or Equal', snippet: '\\geq', preview: '≥' },
      { label: 'Not Equal', snippet: '\\neq', preview: '≠' },
      { label: 'Approximately', snippet: '\\approx', preview: '≈' },
      { label: 'Equivalent', snippet: '\\equiv', preview: '≡' },
      { label: 'Proportional', snippet: '\\propto', preview: '∝' },
      { label: 'Plus-Minus', snippet: '\\pm', preview: '±' },
      { label: 'Minus-Plus', snippet: '\\mp', preview: '∓' },
      { label: 'Dot Product', snippet: '\\cdot', preview: '⋅' },
      { label: 'Cross Product', snippet: '\\times', preview: '×' },
      { label: 'Division', snippet: '\\div', preview: '÷' },
      { label: 'Right Arrow', snippet: '\\to', preview: '→' },
      { label: 'Left Arrow', snippet: '\\gets', preview: '←' },
      { label: 'Bidirectional Arrow', snippet: '\\leftrightarrow', preview: '↔' },
      { label: 'Implies', snippet: '\\implies', preview: '⇒' },
      { label: 'If and Only If', snippet: '\\iff', preview: '⇔' },
      { label: 'Element Of', snippet: '\\in', preview: '∈' },
      { label: 'Not Element Of', snippet: '\\notin', preview: '∉' },
      { label: 'Subset', snippet: '\\subset', preview: '⊂' },
      { label: 'Subset or Equal', snippet: '\\subseteq', preview: '⊆' },
      { label: 'Union', snippet: '\\cup', preview: '∪' },
      { label: 'Intersection', snippet: '\\cap', preview: '∩' },
      { label: 'Set Difference', snippet: '\\setminus', preview: '∖' },
      { label: 'For All', snippet: '\\forall', preview: '∀' },
      { label: 'Exists', snippet: '\\exists', preview: '∃' },
      { label: 'Infinity', snippet: '\\infty', preview: '∞' },
      { label: 'Empty Set', snippet: '\\emptyset', preview: '∅' },
      { label: 'Reduced Planck Constant', snippet: '\\hbar', preview: 'ℏ' },
    ],
  },
  {
    id: 'accents',
    name: 'Accents & Fonts',
    nameEn: 'Accents & Fonts',
    icon: 'x̂',
    items: [
      { label: 'Vector Arrow', snippet: '\\vec{v}', preview: 'v⃗', desc: 'Vector arrow accent' },
      { label: 'Hat (Unit Vector)', snippet: '\\hat{x}', preview: 'x̂', desc: 'Hat or estimator symbol' },
      { label: 'Overline (Mean)', snippet: '\\bar{x}', preview: 'x̄', desc: 'Sample mean bar' },
      { label: 'Tilde', snippet: '\\tilde{x}', preview: 'x̃', desc: 'Approximation tilde' },
      { label: 'First Derivative Dot', snippet: '\\dot{x}', preview: 'ẋ', desc: 'First time derivative' },
      { label: 'Second Derivative Dot', snippet: '\\ddot{x}', preview: 'ẍ', desc: 'Second time derivative' },
      { label: 'Overline Segment', snippet: '\\overline{AB}', preview: 'AB̅', desc: 'Segment overline or complement' },
      { label: 'Underline', snippet: '\\underline{AB}', preview: 'AB̲', desc: 'Underline' },
      { label: 'Bold Math', snippet: '\\mathbf{X}', preview: 'X', desc: 'Bold vector / matrix' },
      { label: 'Real Numbers (ℝ)', snippet: '\\mathbb{R}', preview: 'ℝ', desc: 'Real numbers field' },
      { label: 'Complex Numbers (ℂ)', snippet: '\\mathbb{C}', preview: 'ℂ', desc: 'Complex numbers field' },
      { label: 'Natural Numbers (ℕ)', snippet: '\\mathbb{N}', preview: 'ℕ', desc: 'Natural numbers set' },
      { label: 'Integers (ℤ)', snippet: '\\mathbb{Z}', preview: 'ℤ', desc: 'Integers set' },
      { label: 'Laplace Transform (ℒ)', snippet: '\\mathcal{L}', preview: 'ℒ', desc: 'Script L' },
      { label: 'Hilbert Space (ℋ)', snippet: '\\mathcal{H}', preview: 'ℋ', desc: 'Script H' },
      { label: 'Text in Equation', snippet: '\\text{where } x > 0', preview: 'text', desc: 'Normal text insertion' },
    ],
  },
];

/**
 * Pre-built scientific and academic equations ready for instant insertion and study.
 */
export const LATEX_TEMPLATES = [
  {
    id: 'quadratic',
    category: 'Algebra',
    title: 'Quadratic Formula',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    desc: 'Roots of quadratic equation ax² + bx + c = 0',
  },
  {
    id: 'euler',
    category: 'Analysis & Pure Math',
    title: "Euler's Identity",
    latex: 'e^{i\\pi} + 1 = 0',
    desc: 'Connects fundamental constants e, i, pi, 1, 0',
  },
  {
    id: 'gaussian',
    category: 'Probability & Statistics',
    title: 'Gaussian Normal Distribution',
    latex: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x - \\mu}{\\sigma}\\right)^2}',
    desc: 'Probability density function of normal distribution',
  },
  {
    id: 'fourier',
    category: 'Harmonic Analysis',
    title: 'Fourier Series',
    latex: 'f(x) = \\frac{a_0}{2} + \\sum_{n=1}^{\\infty} \\left( a_n \\cos\\frac{n\\pi x}{L} + b_n \\sin\\frac{n\\pi x}{L} \\right)',
    desc: 'Decomposition of periodic function into harmonics',
  },
  {
    id: 'schrodinger',
    category: 'Quantum Physics',
    title: 'Time-Dependent Schrödinger Equation',
    latex: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)',
    desc: 'Wavefunction motion in quantum mechanics',
  },
  {
    id: 'maxwell',
    category: 'Electromagnetism',
    title: "Maxwell's Equations",
    latex: '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}, \\quad \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}',
    desc: "Gauss's law and Ampere-Maxwell law in vacuum",
  },
  {
    id: 'taylor',
    category: 'Calculus',
    title: 'Taylor Series Expansion',
    latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n',
    desc: 'Polynomial approximation of analytic function around a',
  },
  {
    id: 'bayes',
    category: 'Statistics & AI',
    title: "Bayes' Theorem",
    latex: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
    desc: 'Posterior probability of hypothesis given evidence',
  },
  {
    id: 'einstein',
    category: 'Modern Physics',
    title: 'Mass-Energy Equivalence',
    latex: 'E = m c^2',
    desc: 'Relativistic mass-energy equivalence',
  },
  {
    id: 'cauchy-schwarz',
    category: 'Linear Algebra',
    title: 'Cauchy-Schwarz Inequality',
    latex: '\\left| \\langle \\mathbf{u}, \\mathbf{v} \\rangle \\right|^2 \\leq \\langle \\mathbf{u}, \\mathbf{u} \\rangle \\cdot \\langle \\mathbf{v}, \\mathbf{v} \\rangle',
    desc: 'Fundamental inner product inequality',
  },
  {
    id: 'matrix-inverse',
    category: 'Linear Algebra',
    title: '2×2 Matrix Inverse',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad - bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
    desc: 'Inverse matrix formula with determinant',
  },
];

/**
 * Scans a plain text string for embedded LaTeX expressions ($...$ or $$...$$)
 * and returns matches with their ranges, latex string, and display mode.
 */
export function extractLatexExpressions(text) {
  if (!text) return [];
  const results = [];
  
  // Match display equations $$...$$ or \[...\]
  const displayRegex = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
  let match;
  const covered = [];

  while ((match = displayRegex.exec(text)) !== null) {
    const raw = match[0];
    const latex = (match[1] || match[2]).trim();
    const start = match.index, end = start + raw.length;
    results.push({ start, end, latex, display: true, raw });
    covered.push([start, end]);
  }

  // Match inline equations $...$ or \(...\)
  const inlineRegex = /(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)|\\\(([\s\S]+?)\\\)/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index, end = start + raw.length;
    const isCovered = covered.some(([cs, ce]) => (start >= cs && start < ce) || (end > cs && end <= ce));
    if (!isCovered) {
      const latex = (match[1] || match[2]).trim();
      results.push({ start, end, latex, display: false, raw });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}
