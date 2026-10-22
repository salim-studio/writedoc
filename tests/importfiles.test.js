// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ toasts: [], modals: [], written: [], here: true }));
vi.mock('../src/ui/toast.js', () => ({ toast: vi.fn((message, options) => { calls.toasts.push([message, options]); return { dismiss() {} }; }) }));
vi.mock('../src/ui/modal.js', () => ({ openModal: vi.fn((options) => { calls.modals.push(options); return { close() {} }; }) }));
vi.mock('../src/lib/drive.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    uniqueName: async (name) => name,
    // The user moves on while the first file is being written.
    writeFile: vi.fn(async (path) => { calls.written.push(path); calls.here = false; if (/broken/.test(path)) throw new Error('Disk full'); }),
  };
});

import { importFiles, nothingImportable } from '../src/lib/importfiles.js';

beforeEach(() => { calls.toasts.length = 0; calls.modals.length = 0; calls.written.length = 0; calls.here = true; });
afterEach(() => { vi.clearAllMocks(); });

const docx = (name) => new File(['PK'], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

it('names the file that could not be imported even after the user moved on', async () => {
  const openFile = vi.fn();
  await importFiles([docx('Good.docx'), docx('broken.docx')], { openFile, stillHere: () => calls.here });
  expect(openFile).not.toHaveBeenCalled();
  expect(calls.toasts.map(([message]) => message)).toEqual(['Imported 1 of 2 files']);
  expect(calls.modals.length).toBe(1);
  expect(calls.modals[0].title).toBe('Import details');
  expect(calls.modals[0].content.textContent).toBe('broken.docx: Disk full');
});

it('reports the same details when the user stayed', async () => {
  const onImported = vi.fn();
  await importFiles([docx('Good.docx'), docx('broken.docx')], { openFile: vi.fn(), onImported });
  expect(calls.toasts.map(([message]) => message)).toEqual(['Imported 1 of 2 documents']);
  expect(calls.modals.map((m) => m.content.textContent)).toEqual(['broken.docx: Disk full']);
  expect(onImported).toHaveBeenCalled();
});


it('words the "nothing importable" message for a drop or for the file dialog', async () => {
  const log = new File(['x'], 'photo.png', { type: 'image/png' });
  expect(nothingImportable([log])).toBe('Drop DOCX, Hanword (.hwp, .hwpx), Markdown, HTML, or text files to open them');
  expect(nothingImportable([log], { picked: true })).toBe('That file cannot be imported. Choose DOCX, Hanword (.hwp, .hwpx), Markdown, HTML, or text files');
  expect(nothingImportable([log, log], { picked: true })).toBe('Those files cannot be imported. Choose DOCX, Hanword (.hwp, .hwpx), Markdown, HTML, or text files');
  await importFiles([log], { openFile: vi.fn(), nothingMessage: nothingImportable([log], { picked: true }) });
  expect(calls.toasts.map(([message]) => message)).toEqual(['That file cannot be imported. Choose DOCX, Hanword (.hwp, .hwpx), Markdown, HTML, or text files']);
});
