/**
 * An in-memory stand-in for the app's document store, so the tests can run
 * without a browser database. It answers the same calls the real store does:
 * list, read, write, rename, delete.
 */

import { vi } from 'vitest';
import * as D from '../../src/lib/drive.js';

const FOLDER = 'writedoc';

/** The files the fake holds: path -> blob, with the time each was written. */
export class FakeStore {
  constructor(files = new Map()) {
    this.files = new Map();
    this.meta = new Map();
    this.modified = 100;
    this.kv = new Map();
    this.reads = 0;
    this.writes = [];
    this.deletes = [];
    /** When set, every listing waits for it: a slow listing, as in the app. */
    this.gate = null;
    for (const [path, file] of files instanceof Map ? files : new Map()) {
      if (file && typeof file === 'object' && 'blob' in file) this.put(path, file.blob, file.modified);
      else this.put(path, file);
    }
  }

  /** Put a file in the store. */
  put(path, blob = new Blob(['x']), modified = null) {
    this.files.set(path, blob);
    this.meta.set(path, modified ?? ++this.modified);
    return path;
  }

  /** The time a file was last written. */
  time(path) {
    return this.meta.get(path) ?? 0;
  }

  /** The files directly inside a folder. */
  inside(folder) {
    const prefix = folder.endsWith('/') ? folder : `${folder}/`;
    return [...this.files.keys()]
      .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .map((path) => ({ path, name: path.split('/').pop(), size: this.files.get(path)?.size ?? 0, modified: this.time(path) }));
  }

  async listFiles() {
    if (this.gate) await this.gate;
    return this.inside(FOLDER)
      .filter((f) => D.OPENABLE.test(f.name))
      .map((f) => ({ ...f, uid: null }))
      .sort((a, b) => b.modified - a.modified);
  }

  async listFolder(folder) {
    return this.inside(folder).map((f) => ({ ...f, isDir: false }));
  }

  async readFile(path) {
    this.reads++;
    if (!this.files.has(path)) throw Object.assign(new Error(`${path.split('/').pop()} does not exist`), { code: 'subject_does_not_exist' });
    return this.files.get(path);
  }

  async writeFile(path, blob, { dedupe = false, overwrite = !dedupe } = {}) {
    let target = path;
    if (dedupe && this.files.has(target)) {
      const stem = path.replace(/\.[^.]+$/, '');
      let n = 1;
      target = `${stem} (${n++})${path.slice(stem.length)}`;
      while (this.files.has(target)) target = `${stem} (${n++})${path.slice(stem.length)}`;
    }
    if (!overwrite && this.files.has(target)) throw Object.assign(new Error('A file with that name already exists'), { code: 'already_exists' });
    this.put(target, blob);
    this.writes.push(target);
    return { path: target, name: target.split('/').pop(), size: blob?.size ?? 0, modified: this.time(target) };
  }

  async createFile(path, blob) {
    return (await this.writeFile(path, blob, { dedupe: true })).path;
  }

  async createFileWithMetadata(path, blob) {
    const file = await this.writeFile(path, blob, { dedupe: true });
    return { path: file.path, modified: file.modified };
  }

  async deleteFile(path) {
    this.deletes.push(path);
    if (!this.files.has(path)) throw Object.assign(new Error(`${path.split('/').pop()} does not exist`), { code: 'subject_does_not_exist' });
    this.files.delete(path);
    this.meta.delete(path);
  }

  async deleteFolder(folder) {
    const prefix = folder.endsWith('/') ? folder : `${folder}/`;
    for (const path of [...this.files.keys()]) if (path === folder || path.startsWith(prefix)) { this.files.delete(path); this.meta.delete(path); }
  }

  async renameFile(path, name) {
    const prefix = `${path}/`;
    const children = [...this.files.keys()].filter((key) => key.startsWith(prefix));
    if (!this.files.has(path) && !children.length) throw Object.assign(new Error(`${path.split('/').pop()} does not exist`), { code: 'subject_does_not_exist' });
    const target = `${path.slice(0, path.lastIndexOf('/') + 1)}${name}`;
    if (target !== path && this.files.has(target)) throw Object.assign(new Error('A file with that name already exists'), { code: 'already_exists' });
    // A folder moves with everything in it.
    for (const [key, blob] of [...this.files]) {
      if (key !== path && !key.startsWith(prefix)) continue;
      this.files.delete(key);
      this.meta.delete(key);
      this.put(target + key.slice(path.length), blob);
    }
    return { path: target, name: target.split('/').pop() };
  }

  async statFile(path) {
    if (!this.files.has(path)) return null;
    return { path, name: path.split('/').pop(), size: this.files.get(path)?.size ?? 0, modified: this.time(path), is_dir: false };
  }

  async fileExists(path) {
    return this.files.has(path);
  }

  async uniqueName(base) {
    const stem = base.replace(/\.[^.]+$/, '') || 'Untitled document';
    const extension = base.slice(stem.length) || '.docx';
    let n = 1;
    let name = `${stem}${extension}`;
    while (this.files.has(`${FOLDER}/${name}`)) name = `${stem} (${n++})${extension}`;
    return name;
  }

  async kvGet(key) {
    return this.kv.has(key) ? this.kv.get(key) : null;
  }

  async kvSet(key, value) {
    this.kv.set(key, value);
  }
}

/**
 * Point the app's store at a fake one. The returned store holds the files:
 * `store.files` is the map of path -> blob.
 */
export function installFakeStore(files = new Map()) {
  const store = new FakeStore(files);
  const spies = [];
  const spy = (name, fn) => spies.push(vi.spyOn(D, name).mockImplementation(fn.bind(store)));
  spy('listFiles', store.listFiles);
  spy('listFolder', store.listFolder);
  spy('readFile', store.readFile);
  spy('writeFile', store.writeFile);
  spy('createFile', store.createFile);
  spy('createFileWithMetadata', store.createFileWithMetadata);
  spy('deleteFile', store.deleteFile);
  spy('deleteFolder', store.deleteFolder);
  spy('renameFile', store.renameFile);
  spy('statFile', store.statFile);
  spy('fileExists', store.fileExists);
  spy('uniqueName', store.uniqueName);
  spy('kvGet', store.kvGet);
  spy('kvSet', store.kvSet);
  store.restore = () => spies.forEach((s) => s.mockRestore());
  return store;
}

/** The files a fake store holds, as { path, blob } pairs. */
export function filesOf(store) {
  return [...store.files.entries()].map(([path, blob]) => ({ path, blob }));
}
