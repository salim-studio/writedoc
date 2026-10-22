/**
 * Home: the list of documents in the app folder, with new / import / open
 * actions. Rows open the editor; a per-row menu renames, duplicates,
 * downloads, or deletes. The list lives in this browser, so without a
 * session the screen offers the sign-in instead of the list.
 */

import { el, clear, formatBytes, relativeTime } from '../ui/dom.js';
import { icon, iconEl } from '../ui/icons.js';
import { openMenu, clickClosedMenu, menuAnchor, closeMenu } from '../ui/menu.js';
import { confirmDialog, promptDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { openAppMenu, renderAccountButton } from '../ui/appmenu.js';
import { openShortcuts } from '../ui/shortcuts.js';
import { session } from '../lib/session.js';
import * as D from '../lib/drive.js';
import { TEMPLATES } from '../lib/templates.js';
import { deleteVersions, renameVersions } from '../lib/versions.js';
import { moveGoal, rememberGoal } from '../lib/goal.js';
import { movePosition, forgetPosition } from '../lib/position.js';
import { isStarred, toggleStar, moveStar, forgetStar, pruneStars, starredFirst, starredPaths } from '../lib/starred.js';
import { openModal } from '../ui/modal.js';
import { HANWORD_IMPORTABLE } from '../lib/importers.js';
import { importFiles, nothingImportable } from '../lib/importfiles.js';
import { documentPathKey } from '../lib/document-paths.js';

export const SORTS = [
  { id: 'modified', label: 'Last modified' },
  { id: 'name', label: 'Name' },
  { id: 'size', label: 'Size' },
];
/** Lists longer than this filter after a pause in the typing rather than on every keystroke. */
const SEARCH_AT_ONCE = 400;
const SEARCH_PAUSE_MS = 120;
const SORT_KEY = 'writedoc:sort';

/** Files ordered by the chosen key: newest, A to Z, or largest first. Names compare as shown, without their extension. */
export function sortFiles(files, sort) {
  const list = [...files];
  const byName = (a, b) => D.stripExtension(a.name).localeCompare(D.stripExtension(b.name), undefined, { numeric: true, sensitivity: 'base' }) || a.name.localeCompare(b.name);
  if (sort === 'name') return list.sort(byName);
  if (sort === 'size') return list.sort((a, b) => (b.size || 0) - (a.size || 0) || a.name.localeCompare(b.name));
  return list.sort((a, b) => (b.modified || 0) - (a.modified || 0) || a.name.localeCompare(b.name));
}

export function rememberedSort() {
  try { const v = localStorage.getItem(SORT_KEY); return SORTS.some((s) => s.id === v) ? v : 'modified'; } catch { return 'modified'; }
}

export function homeView({ openPath, newDoc, newFromTemplate, importFile }) {
  let files = [];
  let query = '';
  let sort = rememberedSort();
  let loading = true;
  let error = null;
  let destroyed = false;
  let loadRequest = 0;

  const fileInput = el('input', {
    type: 'file', multiple: true, accept: D.IMPORT_ACCEPT, hidden: true, 'aria-hidden': 'true', tabindex: -1,
    onchange: () => { importMany(fileInput.files, { picked: true }); fileInput.value = ''; },
  });

  /**
   * One file opens in the editor (and is saved from there); several are
   * written straight into the folder so nothing is lost while one is open.
   */
  const importMany = (files, { picked = false } = {}) => importFiles(files, { openFile: importFile, stillHere: () => !destroyed, onImported: load, nothingMessage: nothingImportable(files, { picked }) });
  const pickDevice = () => fileInput.click();

  // A short list filters as the user types; a long one (thousands of rows to rebuild) waits for a pause in the typing.
  let searchTimer = 0;
  const search = el('input.input.home-search', {
    type: 'search', placeholder: 'Search documents', 'aria-label': 'Search documents',
    oninput: () => {
      query = search.value.trim().toLowerCase();
      clearTimeout(searchTimer); searchTimer = 0;
      if (files.length <= SEARCH_AT_ONCE) renderList();
      else searchTimer = setTimeout(() => { searchTimer = 0; if (!destroyed) renderList(); }, SEARCH_PAUSE_MS);
    },
  });

  const list = el('div.file-list', { role: 'region', 'aria-label': 'writedoc' });
  // One live region, on the page from the start, carries what the list is doing: loading, failed, or filtered down to
  // so many documents. A region that arrives already filled is missed by many screen readers; changes to it are read.
  const listStatus = el('span.visually-hidden', { role: 'status' });

  const sortBtn = el('button.btn.btn-ghost.btn-sm.sort-btn', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'Sort documents', onclick: (e) => openSortMenu(e.currentTarget) });
  const renderSortBtn = () => {
    const label = SORTS.find((s) => s.id === sort)?.label || 'Sort';
    sortBtn.replaceChildren(el('span', { html: icon('sort', 15, 2) }), el('span.sort-label', {}, label));
    // The visible text is the current order; the name says what the button does with it.
    sortBtn.setAttribute('aria-label', `Sort documents: ${label}`);
  };
  renderSortBtn();

  function openSortMenu(anchor) {
    openMenu({
      anchor, align: 'end', label: 'Sort by', minWidth: 190,
      items: [{ header: 'Sort by' }, ...SORTS.map((s) => ({ label: s.label, radio: true, checked: sort === s.id, onSelect: () => setSort(s.id) }))],
    });
  }

  function setSort(next) {
    if (next === sort) return;
    sort = next;
    try { localStorage.setItem(SORT_KEY, sort); } catch { /* storage unavailable */ }
    renderSortBtn();
    renderList();
  }

  const avatar = el('button.icon-btn.user-btn', {
    type: 'button', 'aria-label': 'Account menu', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onclick: (e) => openAppMenu(e.currentTarget),
  });
  renderAccountButton(avatar);

  const root = el('div.home.view', {},
    fileInput,
    el('header.home-head', {},
      el('h1.brand', {}, el('img.brand-mark', { src: `${import.meta.env.BASE_URL}logo.svg`, width: 30, height: 30, alt: 'writedoc logo' }), el('span', {}, 'writedoc')),
      el('div.grow'),
      avatar),
    el('main.home-main', {},
      el('div.home-actions', {},
        el('button.btn.btn-primary.btn-lg', { type: 'button', html: icon('plus', 18, 2.2), onclick: newDoc }, el('span', {}, 'New document')),
        el('button.btn.btn-outline.btn-lg', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', html: icon('gridView', 18), onclick: (e) => openTemplateMenu(e.currentTarget) }, el('span', {}, 'Templates')),
        el('button.btn.btn-outline.btn-lg', { type: 'button', html: icon('upload', 18), onclick: pickDevice, title: 'Import DOCX, Hanword (.hwp, .hwpx), Markdown, HTML, or text files' }, el('span', {}, 'Import'))),
      el('div.home-list-head', {},
        el('h2.home-h2', {}, 'Your documents'),
        el('div.home-list-tools', {}, sortBtn, search)),
      list, listStatus),
    el('footer.home-foot', {}, 'Saved as .docx in this browser under ', el('code', {}, `${D.FOLDER}/`)));

  /* Drag and drop anywhere on the home screen imports documents. */
  let dragDepth = 0;
  const dropHint = el('div.drop-hint', { 'aria-hidden': 'true' }, el('div.drop-hint-card', {}, el('span', { html: icon('upload', 26) }), el('span', {}, 'Drop DOCX, Hanword, Markdown, HTML, or text files to import')));
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  root.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth += 1; root.classList.add('dragging'); });
  root.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  root.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) root.classList.remove('dragging'); });
  root.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    root.classList.remove('dragging');
    importMany(e.dataTransfer.files);
  });
  root.append(dropHint);

  function openTemplateMenu(anchor) {
    // A click on the button while its menu is open closes it; the templates are listed only for an opening click.
    if (clickClosedMenu(anchor)) return;
    const builtIn = TEMPLATES.map((t) => ({ label: t.name, icon: t.icon, hint: t.description, onSelect: () => newFromTemplate?.(t.id) }));
    openMenu({ anchor, label: 'Templates', minWidth: 260, items: [{ header: 'New from template' }, ...builtIn] });
  }

  async function load() {
    if (destroyed) return;
    const request = ++loadRequest;
    loading = true;
    error = null;
    renderList();
    try {
      const loaded = await D.listFiles();
      if (destroyed || request !== loadRequest) return;
      files = loaded;
      pruneStars(files);
    } catch (e) {
      if (destroyed || request !== loadRequest) return;
      console.error(e);
      error = 'Could not load your files from this browser.';
    }
    loading = false;
    renderList();
  }

  /** The row's actions, under the menu button or, from a right-click, at the pointer. */
  function fileMenu(file, anchor, point = null) {
    openMenu({
      anchor, ...(point || {}), align: 'end', label: `${file.name} options`,
      items: [
        { label: 'Open', icon: 'brand', onSelect: () => openPath(file.path) },
        { label: isStarred(file.path) ? 'Unstar' : 'Star', icon: 'star', onSelect: () => star(file) },
        { label: 'Rename', icon: 'pencil', onSelect: () => rename(file) },
        { label: 'Duplicate', icon: 'duplicate', onSelect: () => duplicate(file) },
        { label: 'Download', icon: 'download', onSelect: () => download(file) },
        { separator: true },
        { label: 'Delete', icon: 'trash', danger: true, onSelect: () => remove(file) },
      ],
    });
  }

  async function rename(file) {
    if (destroyed) return;
    const ext = file.name.slice(file.name.lastIndexOf('.'));
    // Typing the extension along with the name does not give the file a second one.
    const stem = (value) => { const clean = D.sanitizeName(value); return ext && clean.toLowerCase().endsWith(ext.toLowerCase()) ? clean.slice(0, -ext.length).trim() : clean; };
    let renamed = false;
    const name = await promptDialog({
      title: 'Rename', label: 'Name', value: D.stripExtension(file.name), confirmLabel: 'Rename',
      validate: (v) => {
        const clean = stem(v);
        // Dots alone name no file: "..docx" would show as "." and lose its version history.
        if (!clean || /^\.+$/.test(clean)) return 'Enter a name';
        if (files.some((f) => f.name.toLowerCase() === `${clean}${ext}`.toLowerCase() && f.path !== file.path)) return 'A file with that name already exists';
        return null;
      },
      pendingLabel: 'Renaming…', prepare: async (name, { signal }) => {
        await Promise.resolve();
        if (signal.aborted || destroyed) return;
        const newName = `${stem(name)}${ext}`;
        // Confirming the current name is not a rename; the file is left alone.
        if (newName === file.name) return;
        const target = `${file.path.slice(0, file.path.lastIndexOf('/') + 1)}${newName}`;
        try { await D.renameFile(file.path, newName); }
        catch (cause) { throw new Error(cause?.message || 'Could not rename', { cause }); }
        renamed = true;
        keepFocus = { path: target, control: 'file-menu-btn' };
        // The file already has its new path. Transfer local state now so a
        // listing during the history move cannot prune its old-path star.
        // Listings begun before the rename no longer describe that state.
        loadRequest += 1;
        moveStar(file.path, target);
        moveGoal(file.path, target);
        movePosition(file.path, target);
        await renameVersions(file.path, target);
        // An accepted rename still needs its metadata and list updated if
        // the prompt was cancelled while the request was in flight.
        load();
      },
    });
    if (name != null && renamed && !destroyed) toast('Renamed');
  }

  async function duplicate(file) {
    try {
      const blob = await D.readFile(file.path);
      const stem = D.stripExtension(file.name);
      const ext = file.name.slice(file.name.lastIndexOf('.'));
      const names = new Set(files.map((f) => f.name.toLowerCase()));
      let name = `${stem} copy${ext}`;
      let n = 2;
      while (names.has(name.toLowerCase())) name = `${stem} copy ${n++}${ext}`;
      const path = await D.createFile(`${D.FOLDER}/${name}`, blob);
      keepFocus = { path, control: 'file-menu-btn' };
      toast('Duplicated');
      load();
    } catch (e) {
      if (gone(e)) return;
      toast(e?.message || 'Could not duplicate', { icon: 'alert' });
    }
  }

  /** A file another window deleted or renamed: say so, and show the list as it is now. */
  function gone(e) {
    if (!D.isNotFound(e)) return false;
    toast('That file no longer exists', { icon: 'alert' });
    load();
    return true;
  }

  async function download(file) {
    try {
      const blob = await D.readFile(file.path);
      D.downloadBlob(blob, file.name);
    } catch (e) {
      if (gone(e)) return;
      toast(e?.message || 'Could not download', { icon: 'alert' });
    }
  }

  async function remove(file) {
    const ok = await confirmDialog({
      title: 'Delete document?',
      message: `"${D.stripExtension(file.name)}" will be moved out of your writedoc folder and deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      const index = [...list.querySelectorAll('.file-row')].findIndex((row) => row.dataset.path === file.path);
      // Already gone (another window deleted or renamed it): the deletion is done, and so is the tidying up.
      try { await D.deleteFile(file.path); } catch (e) { if (!D.isNotFound(e)) throw e; }
      keepFocus = { index: Math.max(0, index) };
      deleteVersions(file.path);
      forgetStar(file.path);
      rememberGoal(file.path, null);
      forgetPosition(file.path);
      files = files.filter((f) => f.path !== file.path);
      // A listing started before deletion can still contain this file. Fetch
      // a fresh snapshot and invalidate that request (or its stale error).
      if (loading || error) load();
      else renderList();
      toast('Deleted', { icon: 'trash' });
    } catch (e) {
      toast(e?.message || 'Could not delete', { icon: 'alert' });
    }
  }

  /** Keep a document at the top of the list, or let it go. */
  function star(file) {
    const on = toggleStar(file.path);
    toast(on ? 'Starred. It stays at the top of the list' : 'Unstarred', { icon: 'star' });
    renderList();
  }

  // Where keyboard focus should land after the next render: an action from a
  // row's menu re-renders the list while a dialog or menu still holds focus,
  // so the row cannot be read from the active element then.
  let keepFocus = null;
  function renderList() {
    const active = document.activeElement;
    // A place remembered for the focus (the row a duplicate made, the Retry button's row) is honored only if the
    // user has not moved on meanwhile: typing in the search field must not be interrupted by a row taking the focus.
    const claimed = active && active !== document.body && !list.contains(active) && !active.closest('.modal-root, .menu');
    if (claimed) keepFocus = null;
    // Consumed only once rows are drawn: the spinner shown while the list reloads must not use it up.
    const pending = keepFocus;
    const focusedPath = pending?.path ?? (list.contains(active) ? active.closest('.file-row')?.dataset.path : null);
    const focusedControl = pending?.control ?? ['file-main', 'file-star-btn', 'file-menu-btn'].find((name) => active?.classList.contains(name));
    const focusedIndex = pending?.index ?? null;
    clear(list);
    // Loading, errors, and empty states are messages, not document list items.
    list.setAttribute('role', 'region');
    if (loading) {
      // Announced: the list emptied and nothing has taken its place yet.
      listStatus.textContent = 'Loading your documents';
      list.append(el('div.list-state', {}, el('span.spin', { html: icon('spinner', 22) }), el('span', {}, 'Loading your documents')));
      return;
    }
    if (error) {
      // Retried from the keyboard, the list's first row takes the focus once it loads; a failure again keeps it on the button.
      const retry = el('button.btn.btn-sm', { type: 'button', onclick: () => { keepFocus = { index: 0 }; load(); } }, 'Retry');
      listStatus.textContent = error;
      list.append(el('div.list-state', {}, el('span', { html: icon('wifiOff', 22) }), el('span', {}, error), retry));
      if (pending) { retry.focus({ preventScroll: true }); keepFocus = null; }
      return;
    }
    const stars = new Set(starredPaths());
    // Match the name as shown, without the extension: "docx" is not a search for every document.
    const shown = starredFirst(sortFiles(query ? files.filter((f) => D.stripExtension(f.name).toLowerCase().includes(query)) : files, sort), stars);
    listStatus.textContent = query ? (shown.length ? `${shown.length === 1 ? '1 document' : `${shown.length} documents`} shown` : 'No matches') : '';
    if (!shown.length) {
      // No row is left to take the focus (the last document deleted, or the last match of a search): it goes to
      // the search field or the New document button rather than falling to the page body.
      if (keepFocus) (query ? search : list.closest('.home')?.querySelector('.home-actions .btn-primary, .btn-primary'))?.focus({ preventScroll: true });
      // The request must not wait for the next search that shows some.
      keepFocus = null;
      list.append(el('div.empty', {},
        el('div.empty-icon', { html: icon(query ? 'search' : 'brand', 28) }),
        el('h3.empty-title', {}, query ? 'No matches' : 'No documents yet'),
        el('p.empty-sub', {}, query ? 'Try a different search.' : 'Create a new document or import a DOCX, Hanword (.hwp, .hwpx), Markdown, HTML, or text file to get started.'),
        !query && el('div.row', { style: { justifyContent: 'center', marginTop: '6px' } },
          el('button.btn.btn-primary', { type: 'button', html: icon('plus', 16, 2.2), onclick: newDoc }, el('span', {}, 'New document')),
          el('button.btn.btn-outline', { type: 'button', html: icon('upload', 16), onclick: pickDevice }, el('span', {}, 'Import')))));
      return;
    }
    list.setAttribute('role', 'list');
    keepFocus = null;
    // The three icons every row carries are parsed once and copied, not rebuilt from markup per row.
    const icons = { menu: iconEl('moreV', 18), star: iconEl('star', 17, 2), brand: iconEl('brand', 20, 1.7) };
    for (const file of shown) {
      const menuBtn = el('button.icon-btn.file-menu-btn', {
        type: 'button', 'aria-label': `Options for ${file.name}`, 'aria-haspopup': 'menu', 'aria-expanded': 'false', title: 'Options',
        onclick: (e) => { e.stopPropagation(); fileMenu(file, e.currentTarget); },
      }, icons.menu.cloneNode(true));
      const starred = stars.has(documentPathKey(file.path));
      const starBtn = el('button.icon-btn.file-star-btn', {
        type: 'button', 'aria-label': starred ? `Unstar ${file.name}` : `Star ${file.name}`, 'aria-pressed': String(starred), title: starred ? 'Unstar' : 'Star: keep at the top',
        onclick: (e) => { e.stopPropagation(); star(file); },
      }, icons.star.cloneNode(true));
      const row = el('div.file-row', { role: 'listitem', dataset: { path: file.path }, className: starred ? 'file-row is-starred' : 'file-row' },
        el('button.file-main', { type: 'button', onclick: () => openPath(file.path) },
          el('span.file-icon', {}, icons.brand.cloneNode(true)),
          el('span.file-text', {},
            el('span.file-name', {}, D.stripExtension(file.name)),
            el('span.file-meta', {}, [starred ? 'Starred' : null, HANWORD_IMPORTABLE.test(file.name) ? `Hanword ${file.name.split('.').pop().toUpperCase()}` : null, relativeTime(file.modified), formatBytes(file.size)].filter(Boolean).join(' · ')))),
        starBtn, menuBtn);
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // A keyboard-invoked context menu carries no pointer position; it opens under the menu button.
        fileMenu(file, menuBtn, e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : null);
      });
      list.append(row);
      // A path the app wrote is spelled from its folder; the listing spells the same file from the root.
      if (documentPathKey(file.path) === documentPathKey(focusedPath) && focusedControl) row.querySelector(`.${focusedControl}`)?.focus({ preventScroll: true });
    }
    if (focusedIndex != null && !shown.some((file) => documentPathKey(file.path) === documentPathKey(focusedPath))) {
      // The row is gone (deleted): the one now in its place, or the last one.
      const rows = list.querySelectorAll('.file-row');
      rows[Math.min(focusedIndex, rows.length - 1)]?.querySelector('.file-main')?.focus({ preventScroll: true });
    }
  }

  const onKey = (e) => {
    if (e.key !== '?' || e.altKey || e.metaKey || e.ctrlKey) return;
    if (/^(input|textarea|select)$/i.test(e.target?.tagName || '')) return;
    // A dialog or menu on top has the keyboard; the shortcut list must not open over it.
    if (document.querySelector('.modal-root:not(.closing), .menu') || !root.contains(e.target)) return;
    e.preventDefault();
    openShortcuts();
  };
  document.addEventListener('keydown', onKey);

  load();
  const onSession = () => {
    renderAccountButton(avatar);
  };
  session.addEventListener('change', onSession);

  return {
    el: root,
    destroy() {
      destroyed = true;
      clearTimeout(searchTimer);
      // A menu opened from this view (the templates list, a row's options) goes with it.
      if (menuAnchor() && root.contains(menuAnchor())) closeMenu();
      session.removeEventListener('change', onSession); document.removeEventListener('keydown', onKey);
    },
    reload: load,
  };
}
