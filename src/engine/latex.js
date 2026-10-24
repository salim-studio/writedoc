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
    name: 'تراكيب وأساسيات',
    nameEn: 'Structures',
    icon: '∛',
    items: [
      { label: 'كسر عادي', snippet: '\\frac{a}{b}', preview: 'a/b', desc: 'كسر اعتيادي بسيط' },
      { label: 'كسر معروض', snippet: '\\dfrac{a}{b}', preview: 'a/b', desc: 'كسر كبير للحجم الكامل' },
      { label: 'جذر تربيعي', snippet: '\\sqrt{x}', preview: '√x', desc: 'جذر تربيعي' },
      { label: 'جذر نوني', snippet: '\\sqrt[n]{x}', preview: 'ⁿ√x', desc: 'جذر من الدرجة n' },
      { label: 'أسس وقوى', snippet: 'x^{n}', preview: 'xⁿ', desc: 'قوى وأسس علوية' },
      { label: 'دليل سفلي', snippet: 'x_{i}', preview: 'xᵢ', desc: 'دليل سفلي' },
      { label: 'قوى ودليل', snippet: 'x_{i}^{n}', preview: 'xᵢⁿ', desc: 'قوى ودليل سفلي معاً' },
      { label: 'معامل ثنائي', snippet: '\\binom{n}{k}', preview: '(ⁿₖ)', desc: 'توافيق أو معامل ثنائي' },
      { label: 'أقواس دائرية', snippet: '\\left( x \\right)', preview: '(x)', desc: 'أقواس دائرية متجاوبة الارتفاع' },
      { label: 'أقواس مربعة', snippet: '\\left[ x \\right]', preview: '[x]', desc: 'أقواس مربعة متجاوبة' },
      { label: 'أقواس معقوفة', snippet: '\\left\\{ x \\right\\}', preview: '{x}', desc: 'أقواس مجموعة معقوفة' },
      { label: 'قيمة مطلقة', snippet: '\\left| x \\right|', preview: '|x|', desc: 'مقياس أو قيمة مطلقة' },
      { label: 'معيار متجه', snippet: '\\left\\| \\mathbf{v} \\right\\|', preview: '‖v‖', desc: 'معيار ونورم المتجه' },
      { label: 'أقواس زاوية', snippet: '\\left\\langle x \\right\\rangle', preview: '⟨x⟩', desc: 'أقواس برا-كيت وزوايا' },
    ],
  },
  {
    id: 'calculus',
    name: 'تفاضل وتكامل ومجاميع',
    nameEn: 'Calculus & Operators',
    icon: '∫',
    items: [
      { label: 'تكامل محدد', snippet: '\\int_{a}^{b} f(x) \\, dx', preview: '∫ₐᵇ', desc: 'تكامل محدد من a إلى b' },
      { label: 'تكامل غير محدد', snippet: '\\int f(x) \\, dx', preview: '∫', desc: 'تكامل غير محدد' },
      { label: 'تكامل ثنائي', snippet: '\\iint_{D} f(x, y) \\, dx dy', preview: '∬', desc: 'تكامل ثنائي على منطقة D' },
      { label: 'تكامل ثلاثي', snippet: '\\iiint_{V} f(x, y, z) \\, dV', preview: '∭', desc: 'تكامل حجمي ثلاثي' },
      { label: 'تكامل مساري مغلق', snippet: '\\oint_{C} \\mathbf{F} \\cdot d\\mathbf{r}', preview: '∮', desc: 'تكامل خطي حول مسار مغلق' },
      { label: 'مجموع متسلسلة', snippet: '\\sum_{i=1}^{n} a_i', preview: '∑', desc: 'مجموع من 1 إلى n' },
      { label: 'مجموع لامتناهي', snippet: '\\sum_{n=0}^{\\infty} a_n x^n', preview: '∑^∞', desc: 'متسلسلة قوى لامتناهية' },
      { label: 'جداء نوني', snippet: '\\prod_{i=1}^{n} x_i', preview: '∏', desc: 'حاصل ضرب نوني' },
      { label: 'نهاية لعدد', snippet: '\\lim_{x \\to 0} \\frac{\\sin x}{x}', preview: 'lim', desc: 'نهاية عندما يقترب x من صفر' },
      { label: 'نهاية للانهائية', snippet: '\\lim_{n \\to \\infty} a_n', preview: 'lim→∞', desc: 'نهاية عندما يقترب n من اللانهاية' },
      { label: 'مشتقة أولى', snippet: '\\frac{df}{dx}', preview: 'df/dx', desc: 'المشتقة العادية الأولى' },
      { label: 'مشتقة ثانية', snippet: '\\frac{d^2 y}{dx^2}', preview: 'd²y/dx²', desc: 'المشتقة العادية الثانية' },
      { label: 'مشتقة جزئية', snippet: '\\frac{\\partial f}{\\partial x}', preview: '∂f/∂x', desc: 'مشتقة جزئية بالنسبة إلى x' },
      { label: 'مشتقة جزئية ثانية', snippet: '\\frac{\\partial^2 f}{\\partial x^2}', preview: '∂²f/∂x²', desc: 'مشتقة جزئية من الرتبة الثانية' },
      { label: 'تدرج (Gradient)', snippet: '\\nabla f', preview: '∇f', desc: 'عامل التدرج النابلي' },
      { label: 'تباعد (Divergence)', snippet: '\\nabla \\cdot \\mathbf{v}', preview: '∇·v', desc: 'تباعد الحقل الشعاعي' },
      { label: 'التفاف (Curl)', snippet: '\\nabla \\times \\mathbf{v}', preview: '∇×v', desc: 'التفاف ودوران الحقل' },
      { label: 'لابلاسيان', snippet: '\\Delta f', preview: 'Δf', desc: 'المؤثر اللابلاسي' },
    ],
  },
  {
    id: 'matrices',
    name: 'مصفوفات وأنظمة',
    nameEn: 'Matrices & Systems',
    icon: '▦',
    items: [
      { label: 'مصفوفة 2×2 دائرية', snippet: '\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}', preview: '( 2×2 )', desc: 'مصفوفة دائرية 2 في 2' },
      { label: 'مصفوفة 2×2 مربعة', snippet: '\\begin{bmatrix}\n  a & b \\\\\n  c & d\n\\end{bmatrix}', preview: '[ 2×2 ]', desc: 'مصفوفة أقواس مربعة' },
      { label: 'محدد مصفوفة', snippet: '\\begin{vmatrix}\n  a & b \\\\\n  c & d\n\\end{vmatrix}', preview: '| 2×2 |', desc: 'محدد مصفوفة 2×2' },
      { label: 'مصفوفة 3×3', snippet: '\\begin{pmatrix}\n  a & b & c \\\\\n  d & e & f \\\\\n  g & h & i\n\\end{pmatrix}', preview: '( 3×3 )', desc: 'مصفوفة 3 في 3' },
      { label: 'دالة متعددة القواعد', snippet: '\\begin{cases}\n  x & \\text{if } x > 0 \\\\\n  -x & \\text{if } x \\leq 0\n\\end{cases}', preview: '{ cases', desc: 'تعريف اقتران متعدد القواعد' },
      { label: 'معادلات متسلسلة', snippet: '\\begin{aligned}\n  a &= b + c \\\\\n  &= d + e\n\\end{aligned}', preview: 'aligned', desc: 'محاذاة مجموعة معادلات رأسياً' },
      { label: 'مصفوفة الوحدة', snippet: '\\mathbf{I} = \\begin{pmatrix}\n  1 & 0 \\\\\n  0 & 1\n\\end{pmatrix}', preview: 'I₂', desc: 'مصفوفة المحايدة الثنائية' },
      { label: 'متجه عمودي', snippet: '\\begin{pmatrix}\n  x \\\\\n  y \\\\\n  z\n\\end{pmatrix}', preview: '( 3×1 )', desc: 'شعاع عمودي ثلاثي الأبعاد' },
    ],
  },
  {
    id: 'greek',
    name: 'حروف يونانية',
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
    name: 'علاقات وعمليات وأسهم',
    nameEn: 'Operators & Relations',
    icon: '⇄',
    items: [
      { label: 'أصغر أو يساوي', snippet: '\\leq', preview: '≤' },
      { label: 'أكبر أو يساوي', snippet: '\\geq', preview: '≥' },
      { label: 'لا يساوي', snippet: '\\neq', preview: '≠' },
      { label: 'تقريباً', snippet: '\\approx', preview: '≈' },
      { label: 'تطابق', snippet: '\\equiv', preview: '≡' },
      { label: 'تناسب', snippet: '\\propto', preview: '∝' },
      { label: 'زائد أو ناقص', snippet: '\\pm', preview: '±' },
      { label: 'ناقص أو زائد', snippet: '\\mp', preview: '∓' },
      { label: 'ضرب نقطي', snippet: '\\cdot', preview: '⋅' },
      { label: 'ضرب تقاطعي', snippet: '\\times', preview: '×' },
      { label: 'قسمة', snippet: '\\div', preview: '÷' },
      { label: 'سهم يمين', snippet: '\\to', preview: '→' },
      { label: 'سهم يسار', snippet: '\\gets', preview: '←' },
      { label: 'سهم ذو اتجاهين', snippet: '\\leftrightarrow', preview: '↔' },
      { label: 'يؤدي إلى (استلزام)', snippet: '\\implies', preview: '⇒' },
      { label: 'إذا وفقط إذا', snippet: '\\iff', preview: '⇔' },
      { label: 'ينتمي إلى', snippet: '\\in', preview: '∈' },
      { label: 'لا ينتمي', snippet: '\\notin', preview: '∉' },
      { label: 'مجموعة جزئية', snippet: '\\subset', preview: '⊂' },
      { label: 'مجموعة جزئية أو تساوي', snippet: '\\subseteq', preview: '⊆' },
      { label: 'اتحاد مجموعات', snippet: '\\cup', preview: '∪' },
      { label: 'تقاطع مجموعات', snippet: '\\cap', preview: '∩' },
      { label: 'فرق مجموعات', snippet: '\\setminus', preview: '∖' },
      { label: 'لكل (سور كلي)', snippet: '\\forall', preview: '∀' },
      { label: 'يوجد (سور وجودي)', snippet: '\\exists', preview: '∃' },
      { label: 'لا نهائي', snippet: '\\infty', preview: '∞' },
      { label: 'مجموعة خالية', snippet: '\\emptyset', preview: '∅' },
      { label: 'ثابت بلانك المختزل', snippet: '\\hbar', preview: 'ℏ' },
    ],
  },
  {
    id: 'accents',
    name: 'تزيينات وخطوط',
    nameEn: 'Accents & Fonts',
    icon: 'x̂',
    items: [
      { label: 'متجه', snippet: '\\vec{v}', preview: 'v⃗', desc: 'سهم المتجه' },
      { label: 'قبعة (وحدة متجه)', snippet: '\\hat{x}', preview: 'x̂', desc: 'رمز القبعة أو التقدير' },
      { label: 'شرطة أفقية (متوسط)', snippet: '\\bar{x}', preview: 'x̄', desc: 'المتوسط الحسابي' },
      { label: 'تلدة (مويجة)', snippet: '\\tilde{x}', preview: 'x̃', desc: 'مويجة تقريبية' },
      { label: 'نقطة (مشتقة زمنية)', snippet: '\\dot{x}', preview: 'ẋ', desc: 'مشتقة أولى بالنسبة للزمن' },
      { label: 'نقطتان (تسارع زمني)', snippet: '\\ddot{x}', preview: 'ẍ', desc: 'مشتقة ثانية بالنسبة للزمن' },
      { label: 'خط علوي ممتد', snippet: '\\overline{AB}', preview: 'AB̅', desc: 'قطعة مستقيمة أو متممة' },
      { label: 'خط سفلي', snippet: '\\underline{AB}', preview: 'AB̲', desc: 'تسطير سفلي' },
      { label: 'خط غامق رياضي', snippet: '\\mathbf{X}', preview: 'X', desc: 'متجهات ومصفوفات غامقة' },
      { label: 'مجموعة الأعداد الحقيقية', snippet: '\\mathbb{R}', preview: 'ℝ', desc: 'حقل الأعداد الحقيقية' },
      { label: 'مجموعة الأعداد المركبة', snippet: '\\mathbb{C}', preview: 'ℂ', desc: 'حقل الأعداد العقدية المركبة' },
      { label: 'مجموعة الأعداد الطبيعية', snippet: '\\mathbb{N}', preview: 'ℕ', desc: 'مجموعة الأعداد الطبيعية' },
      { label: 'مجموعة الأعداد الصحيحة', snippet: '\\mathbb{Z}', preview: 'ℤ', desc: 'مجموعة الأعداد الصحيحة' },
      { label: 'فضاء لابلاس / هيلبرت', snippet: '\\mathcal{L}', preview: 'ℒ', desc: 'حرف خطي مزخرف' },
      { label: 'فضاء هيلبرت', snippet: '\\mathcal{H}', preview: 'ℋ', desc: 'فضاء هيلبرت أو هاميلتوني' },
      { label: 'نص عادي داخل المعادلة', snippet: '\\text{where } x > 0', preview: 'text', desc: 'كتابة نص اعتيادي' },
    ],
  },
];

/**
 * Pre-built scientific and academic equations ready for instant insertion and study.
 */
export const LATEX_TEMPLATES = [
  {
    id: 'quadratic',
    category: 'الجبر والحساب',
    title: 'القانون العام لحل المعادلة التربيعية',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    desc: 'جذور المعادلة التربيعية ax² + bx + c = 0',
  },
  {
    id: 'euler',
    category: 'التحليل والرياضيات البحتة',
    title: 'متطابقة أويلر الشهيرة',
    latex: 'e^{i\\pi} + 1 = 0',
    desc: 'تربط أهم خمسة ثوابت رياضية أساسية',
  },
  {
    id: 'gaussian',
    category: 'الإحصاء والاحتمالات',
    title: 'التوزيع الطبيعي (توزيع غاوس)',
    latex: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x - \\mu}{\\sigma}\\right)^2}',
    desc: 'دالة الكثافة الاحتمالية للتوزيع الطبيعي المعياري',
  },
  {
    id: 'fourier',
    category: 'الهندسة والتحليل التوافقي',
    title: 'متسلسلة فورييه',
    latex: 'f(x) = \\frac{a_0}{2} + \\sum_{n=1}^{\\infty} \\left( a_n \\cos\\frac{n\\pi x}{L} + b_n \\sin\\frac{n\\pi x}{L} \\right)',
    desc: 'تحليل الإشارات والدوال الدورية إلى ترددات توافقية',
  },
  {
    id: 'schrodinger',
    category: 'ميكانيكا الكم والفيزياء',
    title: 'معادلة شرودنغر المعتمدة على الزمن',
    latex: 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)',
    desc: 'المعادلة الأساسية لحركة الأجسام المجهرية والدوال الموجية',
  },
  {
    id: 'maxwell',
    category: 'الكهرومغناطيسية',
    title: 'معادلتا ماكسويل الأساسيتان',
    latex: '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}, \\quad \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}',
    desc: 'قانون غاوس وقانون أمبير-ماكسويل في الفراغ',
  },
  {
    id: 'taylor',
    category: 'التفاضل والتكامل',
    title: 'متسلسلة تايلور للدوال التحليلية',
    latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n',
    desc: 'تقريب الدوال حول نقطة a باستخدام المشتقات المتتابعة',
  },
  {
    id: 'bayes',
    category: 'الإحصاء والذكاء الاصطناعي',
    title: 'مبرهنة بايز للاحتمال الشرطي',
    latex: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
    desc: 'حساب الاحتمال البعدي لفرضية بمعلومية الدليل الجديد',
  },
  {
    id: 'einstein',
    category: 'النسبية والفيزياء الحديثة',
    title: 'تكافؤ الكتلة والطاقة لأينشتاين',
    latex: 'E = m c^2',
    desc: 'العلاقة الأساسية بين الطاقة والكتلة وسرعة الضوء',
  },
  {
    id: 'cauchy-schwarz',
    category: 'الجبر الخطي وفضاءات هلبرت',
    title: 'متباينة كوشي - شوارز',
    latex: '\\left| \\langle \\mathbf{u}, \\mathbf{v} \\rangle \\right|^2 \\leq \\langle \\mathbf{u}, \\mathbf{u} \\rangle \\cdot \\langle \\mathbf{v}, \\mathbf{v} \\rangle',
    desc: 'المتباينة المركزية في الجداء الداخلي وفضاء المتجهات',
  },
  {
    id: 'matrix-inverse',
    category: 'الجبر الخطي',
    title: 'معكوس المصفوفة الثنائية',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad - bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
    desc: 'صيغة معكوس المصفوفة المربعة 2×2 ومحددها',
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
