import { describe, expect, it } from 'vitest';
import { accountKey } from '../src/lib/account-key.js';

describe('settings keys', () => {
  it('leaves the key as it is: there is one local user', () => {
    expect(accountKey('writedoc:starred')).toBe('writedoc:starred');
    expect(accountKey('writedoc:goals:writedoc/Report.docx')).toBe('writedoc:goals:writedoc/Report.docx');
  });
});
