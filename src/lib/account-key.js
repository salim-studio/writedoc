/**
 * Stars, word goals and reading positions are kept on this device by file
 * path. There is one person here — the one using the browser — so every
 * setting is kept under one plain key.
 */

/** The storage key for `base`. */
export function accountKey(base) {
  return base;
}
