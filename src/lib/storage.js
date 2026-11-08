/** Browser policy can deny the storage getter itself, before any read or write. */
const memoryFallback = {
  _map: new Map(),
  getItem(key) { return this._map.has(key) ? this._map.get(key) : null; },
  setItem(key, val) { this._map.set(key, String(val)); },
  removeItem(key) { this._map.delete(key); },
  clear() { this._map.clear(); },
  key(i) { return Array.from(this._map.keys())[i] ?? null; },
  get length() { return this._map.size; }
};

export function localStore() {
  try {
    const s = globalThis.localStorage;
    if (s) {
      s.getItem('__test__');
      return s;
    }
  } catch {}
  return memoryFallback;
}
