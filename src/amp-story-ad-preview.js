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
import {assert} from '../lib/assert';
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
    this.storyIframe_ = untilAttached(element, s('.iframe'))
      // First load is upon lit client side takeover.
      .then(whenIframeLoaded);

    render(WrappedIframe(), element);
  }

  async update(dirty) {
    // Deletion/replacement of iframe is necessary so that AMP runtime
    // does not complain about defining custom elements over and over again.
    const oldFrame = await this.storyIframe_;
    const newFrame = oldFrame.cloneNode();
    newFrame.style.visibility = 'hidden';

    const container = oldFrame.parentElement;
    container.appendChild(newFrame);

    const blob = new Blob([dirty], {type: 'text/html'});
    const adSrc = URL.createObjectURL(blob);
    const storyDoc = this.storyDoc.replace('$adSrc$', adSrc);
    writeToIframe(newFrame, patchStoryDoc(storyDoc));
    // Listen for page change event from story that is broadcast when
    // amp-story-auto-ads forces the ad to show.
    newFrame.contentWindow.document.addEventListener(
      'ampstory:switchpage',
      e => {
        if (e.detail.targetPageId === 'i-amphtml-ad-page-1') {
          newFrame.style.visibility = 'visible';
          container.removeChild(oldFrame);
        }
      },
      {once: true}
    );
    this.storyIframe_ = whenIframeLoaded(newFrame);
  }
}
