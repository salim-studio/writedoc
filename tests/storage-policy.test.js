// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { recallGoal, rememberGoal, moveGoal } from '../src/lib/goal.js';
import { recallPosition, rememberPosition, movePosition, forgetPosition } from '../src/lib/position.js';
import { recallZoom, rememberZoom } from '../src/lib/viewprefs.js';

afterEach(() => vi.restoreAllMocks());

it('treats denied browser storage as unavailable for all document preferences', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Storage is blocked', 'SecurityError');
  });
  expect(recallGoal('writedoc/A.docx')).toBeNull();
  expect(recallPosition('writedoc/A.docx')).toBeNull();
  expect(recallZoom()).toBeNull();
  expect(() => {
    rememberGoal('writedoc/A.docx', 500);
    moveGoal('writedoc/A.docx', 'writedoc/B.docx');
    rememberPosition('writedoc/A.docx', { blockId: 'p1', offset: 2 });
    movePosition('writedoc/A.docx', 'writedoc/B.docx');
    forgetPosition('writedoc/B.docx');
    rememberZoom({ value: 125 });
  }).not.toThrow();
});
