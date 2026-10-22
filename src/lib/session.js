/**
 * The state of the app that is not about a document: the theme, and the
 * person using it. There is no account and no sign-in: the documents are in
 * this browser, and the person is whoever is sitting in front of it.
 *
 * Views subscribe to 'change' to re-render the pieces that show these. The
 * theme lives in localStorage so the pre-paint script in index.html can apply
 * it before the first frame.
 */

import { applyTheme, currentTheme } from '../ui/theme.js';

class Session extends EventTarget {
  constructor() {
    super();
    this.user = { username: 'You', uuid: 'local' };
    this.state = 'in';
    this._pictureCache = null;
  }

  async init() {
    applyTheme(currentTheme());
    await this.refresh();
  }

  /** There is nobody to ask about: the app is always ready to be used. */
  async refresh() {
    this.state = 'in';
    this._emit();
  }

  /** The SDK signed the user in on its own (before an AI request, say). */
  signedInAs(user) {
    this.user = user || this.user;
    this.state = 'in';
    this._emit();
  }

  get signedIn() {
    return this.state === 'in';
  }

  /** Nobody is ever signed out: there is no account to lose. */
  get signedOut() {
    return false;
  }

  /** There is no sign-in to open. */
  signIn() {
    return Promise.resolve(true);
  }

  /** The name to show and to sign changes with. */
  get username() {
    return this.user?.username || 'You';
  }

  get accountId() {
    return this.user?.uuid || 'local';
  }

  /**
   * One memory-only entry for the current account, shared by home and editor.
   * There is no picture: the person is whoever is using the browser.
   */
  async getProfilePicture() {
    return null;
  }

  get theme() {
    return currentTheme();
  }

  setTheme(mode) {
    applyTheme(mode);
    this._emit();
  }

  _emit() {
    this._syncPictureCache();
    this.dispatchEvent(new CustomEvent('change'));
  }

  _syncPictureCache() {}
}

export const session = new Session();
