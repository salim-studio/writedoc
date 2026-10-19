import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sendMail, canEmail, EMAIL } from '../src/lib/mail-send.js';
import { saveVersion, listVersions, readVersionMeta, writeVersionMeta, metaPath, MAX_VERSIONS } from '../src/lib/versions.js';

describe('sending mail', () => {
  afterEach(() => { delete globalThis.puter; });
  it('sends an attachment from the user address and asks for permission once when refused', async () => {
    const sent = [], asked = [];
    let refuse = true;
    globalThis.puter = {
      email: { async send(message) { sent.push(message); if (refuse) { refuse = false; return { code: 'forbidden' }; } return { delivered: [message.to] }; } },
      perms: { async request(kind, options) { asked.push(options.permission); } },
    };
    expect(canEmail()).toBe(true);
    const result = await sendMail({ to: 'a@example.com', subject: 'Doc', text: 'Here', username: 'ada', attachments: [{ filename: 'Doc.docx', bytes: new Uint8Array([80, 75]), contentType: 'application/x' }] });
    expect(result).toEqual({ ok: true });
    expect(asked).toEqual(['fs:/ada/.mail:write']);
    expect(sent[1].attachments).toEqual([{ filename: 'Doc.docx', content: 'UEs=', contentType: 'application/x' }]);
  });
  it('reports a daily limit and a missing service', async () => {
    globalThis.puter = { email: { send: async () => ({ code: 'too_many_requests' }) } };
    expect((await sendMail({ to: 'a@example.com', subject: 's', text: 't' })).message).toMatch(/limit/);
    globalThis.puter = {};
    expect((await sendMail({ to: 'a@example.com', subject: 's', text: 't' })).ok).toBe(false);
    expect(EMAIL.test('someone@example.com')).toBe(true);
    expect(EMAIL.test('ada')).toBe(false);
  });
});

describe('version details', () => {
  let files;
  beforeEach(() => {
    files = new Map();
    globalThis.puter = { env: 'web', fs: {
      async readdir(p) { return [...files.entries()].filter(([k]) => k.startsWith(`${p}/`) && !k.slice(p.length + 1).includes('/')).map(([k, v]) => ({ name: k.split('/').pop(), path: k, size: v.size, modified: 1 })); },
      async write(p, blob, { overwrite = true } = {}) { if (files.has(p) && !overwrite) throw new Error('exists'); files.set(p, blob); return { path: p, name: p.split('/').pop() }; },
      async read(p) { if (!files.has(p)) throw Object.assign(new Error('does not exist'), { code: 'subject_does_not_exist' }); return files.get(p); },
      async delete(p) { files.delete(p); },
      async stat(p) { if (files.has(p)) return { path: p }; throw Object.assign(new Error('does not exist'), { code: 'subject_does_not_exist' }); },
      async mkdir() {},
    } };
  });
  afterEach(() => { delete globalThis.puter; });
  it('keeps who saved a version and its name beside it, and trims both', async () => {
    const v = await saveVersion('writedoc/Plan.docx', new Blob(['x']), { now: Date.UTC(2026, 0, 1), meta: { author: 'ada', label: 'Draft' } });
    expect(await readVersionMeta(v)).toEqual({ author: 'ada', label: 'Draft' });
    await writeVersionMeta(v, { author: 'ada', label: 'Final' });
    expect((await readVersionMeta(v)).label).toBe('Final');
    // Details never count as versions.
    expect((await listVersions('writedoc/Plan.docx')).length).toBe(1);
    for (let i = 1; i <= MAX_VERSIONS; i++) await saveVersion('writedoc/Plan.docx', new Blob(['x']), { now: Date.UTC(2026, 0, 1) + i * 1000, meta: { author: 'bob' } });
    expect(files.has(v.path)).toBe(false);
    expect(files.has(metaPath(v.path))).toBe(false);
    expect(await readVersionMeta({ path: 'writedoc/.versions/Plan/missing.docx' })).toEqual({});
  });
});
