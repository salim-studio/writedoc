/**
 * Full-screen stand-ins for the app: the document could not be opened.
 * Writing itself needs nothing but the browser.
 */

import { el } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

export function errorView(title, message, onRetry) {
  return el('div.auth-view.view', {},
    el('div.auth-card', {},
      el('div.empty-icon', { html: icon('wifiOff', 28) }),
      el('h1.auth-title', { style: { fontSize: '22px' } }, title),
      el('p.auth-sub', {}, message),
      el('button.btn.btn-primary.auth-cta', { type: 'button', onclick: onRetry }, 'Try again')));
}
