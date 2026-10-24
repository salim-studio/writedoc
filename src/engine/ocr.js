/**
 * In-browser OCR (Optical Character Recognition) module.
 * Converts images to text using Tesseract.js loaded dynamically on demand.
 * Optimized for multilingual book scans and document citations (Arabic, English, French, etc.).
 */

export const OCR_LANGUAGES = {
  'ara+eng': 'English + Arabic (Multilingual)',
  'eng': 'English',
  'ara': 'Arabic',
  'fra': 'French',
  'spa': 'Spanish',
  'deu': 'German',
  'tur': 'Turkish',
  'fas': 'Persian',
  'urd': 'Urdu',
};

let tesseractLoadPromise = null;

/**
 * Dynamically loads Tesseract.js from CDN if not already present.
 * @returns {Promise<any>}
 */
export function loadTesseract() {
  if (typeof window !== 'undefined' && window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }
  if (tesseractLoadPromise) return tesseractLoadPromise;

  tesseractLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('OCR is only available in browser environment.'));
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;

    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract library loaded but window.Tesseract is not defined.'));
      }
    };

    script.onerror = () => {
      // Fallback CDN if jsdelivr is blocked
      const fallback = document.createElement('script');
      fallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js';
      fallback.async = true;
      fallback.onload = () => {
        if (window.Tesseract) resolve(window.Tesseract);
        else reject(new Error('Failed to initialize OCR engine.'));
      };
      fallback.onerror = () => {
        tesseractLoadPromise = null;
        reject(new Error('Could not load OCR library from CDN. Please check your internet connection.'));
      };
      document.head.appendChild(fallback);
    };

    document.head.appendChild(script);
  });

  return tesseractLoadPromise;
}

/**
 * Obtains an image Blob or Canvas from WriteDoc document engine and image descriptor.
 * @param {object} engine
 * @param {object} image
 * @returns {Blob | HTMLCanvasElement | null}
 */
export function getImageBlobOrCanvas(engine, image) {
  if (!image) return null;
  const assetId = image.assetId;
  const asset = engine.model?.assets?.[assetId];

  if (asset && asset.bytes) {
    return new Blob([asset.bytes], { type: asset.mime || 'image/png' });
  }

  const bitmap = engine.images?.get(assetId);
  if (bitmap) {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
  }

  return null;
}

/**
 * Creates a displayable data URL or object URL for an image.
 * @param {object} engine
 * @param {object} image
 * @returns {string | null}
 */
export function getImageThumbnailUrl(engine, image) {
  const source = getImageBlobOrCanvas(engine, image);
  if (!source) return null;
  if (source instanceof Blob) {
    return URL.createObjectURL(source);
  }
  if (source instanceof HTMLCanvasElement) {
    return source.toDataURL('image/png');
  }
  return null;
}

/**
 * Perform Optical Character Recognition on an image.
 * @param {Blob | HTMLCanvasElement | string} imageSource
 * @param {object} [options]
 * @param {string} [options.lang] e.g. 'ara+eng'
 * @param {function} [options.onProgress] ({ status, progress }) => void
 * @returns {Promise<{ text: string, confidence: number, lines: string[] }>}
 */
export async function recognizeImage(imageSource, options = {}) {
  const lang = options.lang || 'ara+eng';
  const onProgress = options.onProgress || (() => {});

  onProgress({ status: 'loading-core', message: 'Loading OCR engine...', progress: 5 });

  const Tesseract = await loadTesseract();

  onProgress({ status: 'initializing', message: `Initializing language model [${lang}]...`, progress: 15 });

  const worker = await Tesseract.createWorker(lang, 1, {
    logger: m => {
      const p = Math.round((m.progress || 0) * 100);
      let msg = m.status || '';
      if (m.status === 'loading tesseract core') msg = 'Loading OCR core...';
      else if (m.status === 'loading language traineddata') msg = `Loading language dataset (${lang})...`;
      else if (m.status === 'initializing api') msg = 'Initializing engine API...';
      else if (m.status === 'recognizing text') msg = `Recognizing text (${p}%)...`;
      onProgress({ status: m.status, message: msg, progress: 20 + Math.round(p * 0.75) });
    },
  });

  try {
    onProgress({ status: 'recognizing', message: 'Processing image and extracting text...', progress: 85 });
    const ret = await worker.recognize(imageSource);
    const text = (ret.data?.text || '').trim();
    const confidence = ret.data?.confidence || 0;
    const lines = (ret.data?.lines || []).map(l => l.text.trim()).filter(Boolean);

    onProgress({ status: 'done', message: 'Text extraction completed successfully!', progress: 100 });
    return { text, confidence, lines };
  } finally {
    await worker.terminate();
  }
}
