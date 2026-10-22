/**
 * An in-memory stand-in for the app's document store, for suites that mock the
 * whole `drive.js` module. It mirrors the real store's calls and keeps the same
 * " (n)" naming for copies. `__reset()` puts every call back to its default.
 */

import { vi } from 'vitest';

export function makeDriveMock(real) {
  const fs = new Map();
  const meta = new Map();
  const kv = new Map();
  const clock = { now: 1e6 };
  const fail = (path) => Object.assign(new Error(`${String(path).split('/').pop()} does not exist`), { code: 'subject_does_not_exist' });

  const listFolder = async (folder) => {
    const prefix = folder.endsWith('/') ? folder : `${folder}/`;
    return [...fs.keys()]
      .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .map((path) => ({ name: path.split('/').pop(), path, size: fs.get(path)?.size ?? 0, modified: meta.get(path) ?? 0, isDir: false }));
  };

  const impl = {
    writeFile: async (path, blob, { dedupe = false, overwrite = !dedupe } = {}) => {
      let target = path;
      if (dedupe && fs.has(target)) {
        const stem = real.stripExtension(target);
        const extension = String(target).slice(stem.length) || '.docx';
        let n = 1;
        target = `${stem} (${n++})${extension}`;
        while (fs.has(target)) target = `${stem} (${n++})${extension}`;
      }
      if (!overwrite && fs.has(target)) throw Object.assign(new Error(`${String(target).split('/').pop()} already exists`), { code: 'already_exists' });
      fs.set(target, blob);
      meta.set(target, ++clock.now);
      return { path: target, name: String(target).split('/').pop(), size: blob?.size ?? 0, modified: meta.get(target) };
    },
    readFile: async (path) => {
      if (!fs.has(path)) throw fail(path);
      return fs.get(path);
    },
    deleteFile: async (path) => {
      if (!fs.has(path)) throw fail(path);
      fs.delete(path);
      meta.delete(path);
    },
    renameFile: async (path, newName) => {
      const prefix = `${path}/`;
      const hasChildren = [...fs.keys()].some((key) => key.startsWith(prefix));
      if (!fs.has(path) && !hasChildren) throw fail(path);
      const target = `${path.slice(0, path.lastIndexOf('/') + 1)}${real.sanitizeName(newName) || String(path).split('/').pop()}`;
      if (target !== path && fs.has(target)) throw Object.assign(new Error(`${target.split('/').pop()} already exists`), { code: 'already_exists' });
      for (const [key, blob] of [...fs]) {
        if (key !== path && !key.startsWith(prefix)) continue;
        fs.delete(key);
        meta.delete(key);
        fs.set(target + key.slice(path.length), blob);
        meta.set(target + key.slice(path.length), ++clock.now);
      }
      return { path: target, name: target.split('/').pop(), modified: meta.get(target) };
    },
    statFile: async (path) => {
      if (!fs.has(path)) return null;
      return { path, name: String(path).split('/').pop(), size: fs.get(path)?.size ?? 0, modified: meta.get(path) ?? 0, is_dir: false };
    },
    deleteFolder: async (folder) => {
      const prefix = folder.endsWith('/') ? folder : `${folder}/`;
      for (const path of [...fs.keys()]) {
        if (path === folder || path.startsWith(prefix)) {
          fs.delete(path);
          meta.delete(path);
        }
      }
    },
    fileExists: async (path) => fs.has(path),
    listFolder,
    listFiles: async () => (await listFolder(real.FOLDER))
      .filter((file) => real.OPENABLE.test(file.name))
      .sort((a, b) => b.modified - a.modified),
    uniqueName: async (base) => {
      const stem = real.stripExtension(base) || 'Untitled document';
      const extension = String(base).slice(stem.length) || '.docx';
      let name = `${stem}${extension}`;
      let n = 1;
      while (fs.has(`${real.FOLDER}/${name}`)) name = `${stem} (${n++})${extension}`;
      return name;
    },
    kvGet: async (key) => (kv.has(key) ? kv.get(key) : null),
    kvSet: async (key, value) => { kv.set(key, value); },
    downloadBlob: () => {},
  };

  const mocked = {};
  for (const [name, fn] of Object.entries(impl)) mocked[name] = vi.fn(fn);

  const composed = {
    createFile: async (path, blob) => (await mocked.writeFile(path, blob, { dedupe: true })).path,
    createFileWithMetadata: async (path, blob) => {
      const file = fs.has(path)
        ? await mocked.writeFile(path, blob, { dedupe: true })
        : await mocked.writeFile(path, blob);
      return { path: file.path, modified: file.modified };
    },
  };
  for (const [name, fn] of Object.entries(composed)) mocked[name] = vi.fn(fn);

  return {
    ...real,
    ...mocked,
    __fs: fs,
    __meta: meta,
    __kv: kv,
    __reset: () => {
      for (const [name, fn] of Object.entries({ ...impl, ...composed })) mocked[name].mockReset().mockImplementation(fn);
    },
  };
}
