/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './amp-story-ad-preview.css';
import {ampStoryAutoAdsRE, storyAdsConfig} from './story-ad-config';
import {assert} from '../lib/assert';
import {getBlobUrl} from './utils/blob';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {minifyInlineJs} from './utils/minify-inline-js';
import {untilAttached} from './utils/until-attached';
import {whenIframeLoaded, writeToIframe} from './utils/iframe';

const {n, s} = getNamespace('amp-story-ad-preview');

const defaultIframeSandbox = [
  'allow-scripts',
  'allow-forms',
  'allow-same-origin',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation',
].join(' ');

/**
 * Renders a wrapped iframe for story to be rendered into.
 * @return {lit-html/TemplateResult}
 */
const WrappedIframe = () => html`
  <div class="${n('wrap')}">
    <iframe
      allowpaymentrequest
      allowfullscreen
      class=${n('iframe')}
      sandbox=${defaultIframeSandbox}
      title="AMP Story Ad Preview"
      srcdoc="PUT LOADER HERE PUT LOADER HERE PUT LOADER HERE"
    >
      <p>Loading…</p>
    </iframe>
  </div>
`;

const httpsCircumventionPatch = minifyInlineJs(`
  (doc => {
    const createElement = doc.createElement;
    doc.createElement = function(tagName) {
      const el = createElement.apply(doc, arguments);
      if (/^a$/i.test(tagName)) {
        Object.defineProperty(el, 'protocol', {value: 'https:'});
      }
      return el;
    };
  })(document);
  `);

const blobCorsPatch = minifyInlineJs(`
  (win => {
    const realFetch = win.fetch;
    win.fetch = function(url) {
      const args = Array.prototype.slice.call(arguments);
      if (url.startsWith('blob:')) {
        args[0] = url.split('?')[0];
      }
      return realFetch.apply(win, args);
    }
  })(window);
`);

const addContentToHead = (docStr, headContent) =>
  docStr.replace('<head>', `<head><script>${headContent}</script>`);

const insertHttpsCircumventionPatch = docStr =>
  addContentToHead(docStr, httpsCircumventionPatch);

const insertBlobCorsPatch = docStr => addContentToHead(docStr, blobCorsPatch);

/**
 * Patches an <amp-story>  document string for REPL support:
 * - Monkey-patches `document.createElement()` to circumvent AMP's HTTPS checks.
 * - Monkey-patches `window.fetch()` to allow blob url without adding amp cors param.
 * @param {string} docStr
 * @return {string}
 */
const patchStoryDoc = docStr =>
  insertHttpsCircumventionPatch(insertBlobCorsPatch(docStr));

/**
 * Gets amp-story document string from `data-template` attribute.
 * (DESTRUCTIVE: Unsets `data-template` to clear memory.)
 * @param {Element} element
 * @return {string}
 */
function getDataTemplate(element) {
  const {template} = element.dataset;
  element.removeAttribute('data-template');
  return assert(template, `Expected [data-template] on ${element}`);
}

export default class AmpStoryAdPreview {
  constructor(win, element) {
    /** @private @const {!Window>} */
    this.win = win;

    /** @public {string} */
    this.storyDoc = getDataTemplate(element);

    /** @private {!Promise<HTMLIFrameElement>} */
    this.visibleStoryFrame_ = untilAttached(element, s('.iframe'))
      // First load is upon lit client side takeover.
      .then(whenIframeLoaded);

    /** @private {?HTMLIFrameElement} */
    this.pendingFrame_ = null;

    render(WrappedIframe(), element);
  }

  getAdUrl() {
    return this.adUrl_;
  }

  /**
   * Refresh preview in ad mode.
   * @param {string} dirty
   */
  async update(dirty) {
    const {oldFrame, newFrame} = await this.removeAndReplaceFrame_('hidden');
    this.adUrl_ = getBlobUrl(dirty);
    this.storyDoc = this.storyDoc.replace(
      ampStoryAutoAdsRE,
      storyAdsConfig(this.adUrl_, /* forceAd */ true)
    );
    this.writeStoryFrame_(newFrame);
    this.addReadyListener_(newFrame, oldFrame);
    this.pendingFrame_ = newFrame;
  }

  /**
   * Refresh preview in story mode.
   * @param {string} dirty
   */
  async updateOuter(dirty) {
    const {oldFrame, newFrame} = await this.removeAndReplaceFrame_('visible');
    this.storyDoc = dirty;
    this.writeStoryFrame_(newFrame);
    this.container_.removeChild(oldFrame);
    this.visibleStoryFrame_ = Promise.resolve(newFrame);
  }

  /**
   * Deletion/replacement of iframe is necessary so that AMP runtime
   * does not complain about defining custom elements over and over again.
   * @param {string} visibility
   * @return {{oldFrame: HTMLIFrameElement, newFrame: HTMLIFrameElement}}
   */
  async removeAndReplaceFrame_(visibility) {
    const oldFrame = await this.visibleStoryFrame_;
    const newFrame = oldFrame.cloneNode();
    this.container_ = this.container_ || oldFrame.parentElement;
    this.maybeClearUnfinishedFrame_();
    newFrame.style.visibility = visibility;
    this.container_.appendChild(newFrame);
    return {oldFrame, newFrame};
  }

  /**
   * Write content to existing iframe element.
   * @param {!HTMLIFrameElement} newFrame
   */
  writeStoryFrame_(newFrame) {
    writeToIframe(newFrame, patchStoryDoc(this.storyDoc));
  }

  /**
   * Listen for page change event from story that is broadcast when
   * amp-story-auto-ads forces the ad to show. When ready make the new
   * frame visible, and delete the old one for a _smooth_ transition.
   * @param {!HTMLIFrameElement} newFrame
   * @param {!HTMLIFrameElement} oldFrame
   */
  addReadyListener_(newFrame, oldFrame) {
    newFrame.contentWindow.document.addEventListener(
      'ampstory:switchpage',
      e => {
        if (
          e.detail.targetPageId === 'i-amphtml-ad-page-1' &&
          // Protection against this listener trying to display and delete an
          // ad which never loaded before a new update.
          this.pendingFrame_ === newFrame
        ) {
          newFrame.style.visibility = 'visible';
          this.container_.removeChild(oldFrame);
          this.visibleStoryFrame_ = Promise.resolve(newFrame);
          this.pendingFrame_ = null;
        }
      },
      {once: true}
    );
  }

  maybeClearUnfinishedFrame_() {
    if (this.pendingFrame_) {
      this.container_.removeChild(this.pendingFrame_);
    }
  }
}
