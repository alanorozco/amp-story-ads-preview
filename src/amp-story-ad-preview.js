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
import {CTA_TYPES} from './cta-types';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {memoize} from 'lodash-es';
import {minifyInlineJs} from './utils/minify-inline-js';
import {navigationPatch} from './story-patch';
import {untilAttached} from './utils/until-attached';
import {whenIframeLoaded, writeToIframe} from './utils/iframe';

const {n, s} = getNamespace('amp-story-ad-preview');

const defaultCtaType = 'LEARN_MORE';
const defaultCtaUrl = 'https://amp.dev';

const metaCtaRe = /<meta\s+[^>]*name=['"]?amp-cta-(type|url)['"]?[^>]*>/gi;

const defaultIframeSandbox = [
  'allow-scripts',
  'allow-forms',
  'allow-same-origin',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation',
].join(' ');

/**
 * Renders a wrapped iframe with optional srcdoc.
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

// const fakeHeadPatch = '<!-- <head> -->';

const insertHttpsCircumventionPatch = docStr =>
  addContentToHead(docStr, httpsCircumventionPatch);

const addContentToHead = (docStr, headContent) =>
  docStr.replace('<head>', `<head><script>${headContent}</script>`);

// const addContentToHtml = (docStr, content) =>
//   docStr.replace('<html amp4ads>', `<html amp4ads>\n${content}`);

const storyNavigationPatch = (docStr, pageId) =>
  addContentToHead(docStr, navigationPatch.replace('$pageId$', pageId));

const insertBlobCorsPatch = docStr => addContentToHead(docStr, blobCorsPatch);

// const insertFakeHeadPatch = docStr => addContentToHtml(docStr, fakeHeadPatch);

/**
 * Patches an <amp-story> ad document string for REPL support:
 * - Sets `amp-story-visible` attribute on `<body>` for interop.
 * - Monkey-patches `document.createElement()` to circumvent AMP's HTTPS checks.
 * @param {string} docStr
 * @return {string}
 */
const patch = docStr =>
  insertHttpsCircumventionPatch(insertBlobCorsPatch(docStr));

// Sets starting page in head content.
function patchOuter(str, pageId) {
  if (!pageId) {
    return str;
  }
  return storyNavigationPatch(str, pageId);
}

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

const htmlParserFor = memoize(win => win.document.createElement('div'));

const awaitSelect = (iframeReady, selector) =>
  iframeReady.then(iframe => iframe.contentDocument.querySelector(selector));

// TODO(ccordry): reintroduce this once new rendering engine is finalized.
function setMetaCtaLink(win, docStr, ctaLink) {
  let type = defaultCtaType;
  let url = defaultCtaUrl;
  const matches = docStr.match(metaCtaRe);
  if (matches && matches.length > 0) {
    const parser = htmlParserFor(win);
    parser.innerHTML = matches.join('\n');
    const metas = parser.querySelectorAll('meta');
    parser.innerHTML = '';
    for (const meta of metas) {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name == 'amp-cta-type') {
        type = content;
      }
      if (name == 'amp-cta-url') {
        url = content;
      }
    }
  }
  ctaLink.setAttribute('href', url);
  ctaLink.textContent = assert(CTA_TYPES[type], `Unknown CTA type ${type}`);
}

export default class AmpStoryAdPreview {
  constructor(win, element) {
    /** @private @const {!Window>} */
    this.win = win;

    /** @public {string} */
    this.storyDoc = getDataTemplate(element);

    /** @private @const {!Promise<HTMLIFrameElement>} */
    this.storyIframe_ = untilAttached(element, s('.iframe'))
      // First load is upon lit hydration.
      .then(whenIframeLoaded);
    // .then(iframe => {
    //   debugger;
    //   writeToIframe(iframe, patchOuter(this.storyDoc, 'page-1'));
    //   return whenIframeLoaded(iframe);
    // });

    /** @private @const {!Promise<HTMLIFrameElement>} */
    this.autoAdEl_ = awaitSelect(this.storyIframe_, 'amp-story-auto-ads'); // xzibit.png

    /** @private @const {!Promise<Element>} */
    this.storyCtaLink_ = awaitSelect(
      this.storyIframe_,
      '.i-amphtml-story-ad-link'
    );

    render(WrappedIframe(), element);
  }

  // /**
  //  * Updates the current preview with full document HTML.
  //  * @param {string} dirty Dirty document HTML.
  //  */
  // async updateInner(dirty) {
  //   // TODO: Expose AMP runtime failures & either:
  //   // a) purifyHtml() from ampproject/src/purifier
  //   // b) reject when invalid
  //   // Navigate back to ad page
  //   setMetaCtaLink(this.win, dirty, await this.storyCtaLink_);
  //   this.adIframe_ = await awaitSelect(this.storyIframe_, 'iframe');
  //   writeToIframe(await this.adIframe_, patch(dirty));
  // }

  // async updateBothInnerAndOuter(dirty, dirtyInner, pageId) {
  //   this.storyDoc = dirty;
  //   writeToIframe(await this.storyIframe_, patchOuter(this.storyDoc, pageId));
  //   await whenIframeLoaded(await this.storyIframe_);
  //   this.storyCtaLink_ = awaitSelect(
  //     this.storyIframe_,
  //     '.i-amphtml-story-ad-link'
  //   );
  //   setMetaCtaLink(this.win, dirtyInner, await this.storyCtaLink_);
  //   this.adIframe_ = await awaitSelect(this.storyIframe_, 'iframe');
  //   writeToIframe(await this.adIframe_, patch(dirtyInner));
  // }

  async update(dirty) {
    const blob = new Blob([dirty], {type: 'text/html'}); // the blob
    const adSrc = URL.createObjectURL(blob);
    const storyDoc = this.storyDoc.replace('$adSrc$', adSrc);
    writeToIframe(await this.storyIframe_, patch(storyDoc));
  }
}
