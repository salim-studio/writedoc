/** The app's own folder: every document path starts with it, in this browser. */
export const DOCUMENT_FOLDER = 'writedoc';

/** The folder documents live in. */
export function documentRoot() {
  return DOCUMENT_FOLDER;
}

/** Local storage has one spelling for a path, so there is nothing to remember. */
export function rememberDocumentRoot() {}

/** Local storage has one spelling for a path, so there is nothing to learn. */
export function learnDocumentPath() {}

/** The key a document is remembered under: its path, unchanged. */
export function documentPathKey(path) {
  if (typeof path !== 'string' || !path.startsWith(`${DOCUMENT_FOLDER}/`)) return path;
  return path;
}

/** Nothing to migrate: the paths were never absolute. */
export function migrateDocumentMap(storage, key, map) {
  return map;
}
