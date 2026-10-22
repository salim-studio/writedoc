/**
 * The app's own storage. There is no account and no server: every document
 * lives in this browser, as a .docx blob in IndexedDB, under the path the app
 * gives it (`writedoc/Name.docx`).
 *
 * The module offers the small filesystem the rest of the app was written
 * against — read, write, list, rename, delete — so the document model, the
 * version history, and the home screen keep working unchanged.
 *
 *  files     documents and their versions, as blobs
 *  settings  small per-browser preferences
 *
 * A browser that refuses to store anything (private windows) still works:
 * the files are then kept in memory for as long as the tab is open.
 */

import { DOCUMENT_FOLDER } from './document-paths.js';

export const FOLDER = DOCUMENT_FOLDER;
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const OPENABLE = /\.(docx|dotx|docm|hwp|hwpx)$/i;
export const DOCUMENT_EXTENSIONS = ['.docx', '.dotx', '.docm', '.hwp', '.hwpx'];
/** Device imports: DOCX, Hanword, and the text formats the engine reads. */
export const IMPORTABLE = /\.(docx|dotx|docm|hwp|hwpx|md|markdown|txt|html?)$/i;
export const IMPORT_ACCEPT = '.docx,.dotx,.docm,.hwp,.hwpx,.md,.markdown,.txt,.html,.htm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp,application/haansofthwp,application/vnd.hancom.hwp,application/hwp+zip,text/markdown,text/plain,text/html';
/** Image types the engine places on the page, with their MIME types. */
export const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' };
export const IMAGE_EXTENSIONS = Object.keys(IMAGE_TYPES);

/** The MIME type for a file name by its extension, or '' when unknown. */
export function mimeFor(name) {
  const m = /\.[^./\\]+$/.exec(String(name || ''));
  if (m && /\.hwp$/i.test(m[0])) return 'application/x-hwp';
  if (m && /\.hwpx$/i.test(m[0])) return 'application/hwp+zip';
  return (m && IMAGE_TYPES[m[0].toLowerCase()]) || (m && OPENABLE.test(m[0]) ? DOCX_MIME : '');
}

/* ---------- Names ---------- */

export function isNotFound(err) {
  const code = err?.code || err?.error?.code || '';
  const msg = String(err?.message || err?.error?.message || err || '').toLowerCase();
  return code === 'subject_does_not_exist' || code === 'ENOENT' || msg.includes('not found') || msg.includes('does not exist') || msg.includes('no such');
}

export function displayName(path) {
  return String(path || '').split('/').pop();
}

export function stripExtension(name) {
  return String(name || '').replace(/\.[^./\\]+$/, '');
}

/**
 * A safe file name: no path separators or control characters, trimmed. The
 * invisible format characters go too: a right-to-left override would show
 * "exe.docx" as "xcod.exe", and a zero-width space makes two names look
 * alike while the "already exists" checks tell them apart.
 */
/** The document name a typed file name stands for: the extension off, then made safe (dots alone are no name). */
export function documentStem(name) {
  return sanitizeName(String(name || '').replace(/\.docx$/i, ''));
}

export function sanitizeName(name) {
  // Trim again after cutting to length: a space at the cut would end the name.
  // A cut through an emoji would leave half of it, which no URL can carry.
  const clean = String(name || '').replace(/[/\\]/g, ' ').replace(/[\x00-\x1f\x7f\u200b\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g, '').trim().slice(0, 200).replace(/[\ud800-\udbff]$/, '').trim();
  // Dots alone name no file: "..docx" would show as "." and its version history could not follow it.
  return /^\.+$/.test(clean) ? '' : clean;
}

export function ensureDocx(name) {
  const clean = sanitizeName(name);
  return /\.docx$/i.test(clean) ? clean : `${clean}.docx`;
}

/* ---------- The store ---------- */

const DB_NAME = 'writedoc';
const DB_VERSION = 1;
const STORE = 'files';

/** Files kept in memory when the browser stores nothing (private windows). */
const memory = new Map();
let database = null;
let opened = null;

function openDatabase() {
  if (opened) return opened;
  opened = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let request;
    try { request = indexedDB.open(DB_NAME, DB_VERSION); }
    catch { return resolve(null); }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'path' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return opened;
}

const ask = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function store() {
  database = database ?? await openDatabase();
  return database;
}

async function getRecord(path) {
  const db = await store();
  if (!db) return memory.get(path) || null;
  try {
    const tx = db.transaction(STORE, 'readonly');
    const value = await ask(tx.objectStore(STORE).get(path));
    return value || null;
  } catch {
    return memory.get(path) || null;
  }
}

async function allRecords() {
  const db = await store();
  if (!db) return [...memory.values()];
  try {
    const tx = db.transaction(STORE, 'readonly');
    return (await ask(tx.objectStore(STORE).getAll())) || [];
  } catch {
    return [...memory.values()];
  }
}

async function putRecord(record) {
  const db = await store();
  if (!db) { memory.set(record.path, record); return record; }
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(record);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('The storage was closed'));
  });
  return record;
}

async function dropRecord(path) {
  const db = await store();
  if (!db) { memory.delete(path); return; }
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(path);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('The storage was closed'));
  });
}

/* ---------- Paths ---------- */

const nameOf = (path) => String(path || '').split('/').pop();
const parentOf = (path) => String(path || '').slice(0, String(path).lastIndexOf('/'));
const notFound = (path) => Object.assign(new Error(`${nameOf(path)} does not exist`), { code: 'subject_does_not_exist' });

/** Every folder above a path, so a write always lands in a folder that exists. */
async function ensureFolder(path) {
  if (!path) return;
  const parts = path.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!await getRecord(current)) await putRecord({ path: current, name: part, isDir: true, size: 0, modified: Date.now() });
  }
}

/* ---------- Files ---------- */

/** Document files in the app folder, newest first. */
export async function listFiles() {
  const items = await listFolder(FOLDER);
  return items
    .filter((it) => !it.isDir && OPENABLE.test(it.name))
    .map((it) => ({ name: it.name, path: it.path, size: it.size, modified: it.modified, uid: null }))
    .sort((a, b) => (b.modified || 0) - (a.modified || 0));
}

/** Read a file as a Blob. */
export async function readFile(path) {
  const record = await getRecord(path);
  if (!record || record.isDir) throw notFound(path);
  return record.blob instanceof Blob ? record.blob : new Blob([record.blob]);
}

/** Write a Blob to a path, creating the folder when needed. Returns the file. */
export async function writeFile(path, blob, { dedupe = false, overwrite = !dedupe } = {}) {
  let target = path;
  if (dedupe && await fileExists(target)) target = await unusedPath(path);
  if (!overwrite && await fileExists(target)) throw Object.assign(new Error(`${nameOf(target)} already exists`), { code: 'already_exists' });
  await ensureFolder(parentOf(target));
  const record = { path: target, name: nameOf(target), blob, size: blob?.size ?? 0, modified: Date.now(), isDir: false };
  await putRecord(record);
  return { path: target, name: record.name, size: record.size, modified: record.modified };
}

/** Create a fresh file atomically and retain its actual name if another writer wins a collision. */
export async function createFile(path, blob) {
  return (await createFileWithMetadata(path, blob)).path;
}

/** Create a file and retain the returned timestamp for the next conflict check. */
export async function createFileWithMetadata(path, blob) {
  const file = await writeFile(path, blob, { dedupe: true });
  return { path: file.path, modified: file.modified ?? null };
}

export async function deleteFile(path) {
  const record = await getRecord(path);
  if (!record) throw notFound(path);
  await dropRecord(path);
}

/** Remove a folder and everything in it. */
export async function deleteFolder(path) {
  const prefix = path.endsWith('/') ? path : `${path}/`;
  const records = await allRecords();
  for (const record of records) {
    if (record.path === path || record.path.startsWith(prefix)) await dropRecord(record.path);
  }
}

/** Everything directly inside a folder ({ name, path, size, modified, isDir }); [] when it does not exist. */
export async function listFolder(path) {
  const prefix = path.endsWith('/') ? path : `${path}/`;
  const records = await allRecords();
  return records
    .filter((record) => record.path.startsWith(prefix) && !record.path.slice(prefix.length).includes('/'))
    .map((record) => ({ name: record.name, path: record.path, size: record.size || 0, modified: record.modified || 0, isDir: !!record.isDir }));
}

export async function renameFile(path, newName) {
  const record = await getRecord(path);
  if (!record) throw notFound(path);
  const target = `${parentOf(path)}/${sanitizeName(newName) || nameOf(path)}`;
  if (target === path) return { path, name: nameOf(path) };
  if (await getRecord(target)) throw Object.assign(new Error(`${nameOf(target)} already exists`), { code: 'already_exists' });
  const modified = Date.now();
  await putRecord({ ...record, path: target, name: nameOf(target), modified });
  await dropRecord(path);
  // A folder moves with everything in it.
  for (const child of await allRecords()) {
    if (!child.path.startsWith(`${path}/`)) continue;
    const moved = `${target}${child.path.slice(path.length)}`;
    await putRecord({ ...child, path: moved, name: nameOf(moved) });
    await dropRecord(child.path);
  }
  return { path: target, name: nameOf(target), modified };
}

export async function statFile(path) {
  const record = await getRecord(path);
  if (!record) return null;
  return { path: record.path, name: record.name, size: record.size || 0, modified: record.modified || 0, is_dir: !!record.isDir };
}

export async function fileExists(path) {
  return !!(await getRecord(path));
}

/** A path in the same folder that no file uses yet. */
async function unusedPath(path) {
  const stem = stripExtension(nameOf(path)) || 'Untitled document';
  const extension = nameOf(path).slice(stem.length);
  let n = 1;
  let candidate = `${parentOf(path)}/${stem} (${n++})${extension}`;
  while (await fileExists(candidate)) candidate = `${parentOf(path)}/${stem} (${n++})${extension}`;
  return candidate;
}

/** A name that does not collide with an existing file in the folder. */
export async function uniqueName(base) {
  const stem = stripExtension(base) || 'Untitled document';
  const extension = nameOf(base).slice(stem.length) || '.docx';
  let n = 1;
  let name = `${stem}${extension}`;
  while (await fileExists(`${FOLDER}/${name}`)) name = `${stem} (${n++})${extension}`;
  return name;
}

/* ---------- Small per-browser settings ---------- */

/** A setting kept in this browser, or null when there is none. */
export async function kvGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Save a small setting in this browser. */
export async function kvSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/* ---------- Downloads ---------- */

/** Browser download of a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ---------- The environment ---------- */

/** The app runs on its own now: there is no desktop shell around it. */
export function env() {
  return 'web';
}

export function isApp() {
  return false;
}

export function hasSDK() {
  return false;
}

/** The window title of a desktop shell: the page title here. */
export function setWindowTitle(title) {
  try { document.title = title; } catch { /* not in a window */ }
}

/** Nothing launches the app with files. */
export function onLaunchedWithItems() {}

/** Documents are local, so their paths need no preparation. */
export async function prepareDocumentPaths() {}

/* ---------- What the app does not have ---------- */

/** There is no account: nobody signs in, and nobody signs out. */
export async function isSignedIn() {
  return true;
}

export async function signIn() {
  return true;
}

export function signOut() {
  return Promise.resolve();
}

export async function getUser() {
  return { username: 'You', uuid: 'local' };
}

export async function getProfilePicture() {
  return null;
}

export function onAuth() {}

/** No AI service is connected. */
export function canUseAi() {
  return false;
}

export function aiChat() {
  throw new Error('No AI service is connected');
}

export function canMakeImages() {
  return false;
}

export function makeImage() {
  throw new Error('No image service is connected');
}

export function canSpeak() {
  return false;
}

export async function speak() {
  throw new Error('No speech service is connected');
}

/** No web hosting. */
export function canHost() {
  return false;
}

export function hostingCreate() {
  throw new Error('No hosting is connected');
}

export function hostingUpdate() {
  throw new Error('No hosting is connected');
}

export function hostingDelete() {
  throw new Error('No hosting is connected');
}
