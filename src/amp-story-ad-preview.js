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
import {ifDefined} from 'lit-html/directives/if-defined';
import {minifyInlineJs} from './utils/minify-inline-js';
import {setSrcdocAsyncMultiStrategy, whenIframeLoaded} from './utils/iframe';
import {untilAttached} from './utils/until-attached';

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
  'allow-presentation',
  'allow-top-navigation',
].join(' ');

/**
 * Renders a wrapped iframe with optional srcdoc.
 * @param {string=} srcdoc
 * @return {lit-html/TemplateResult}
 */
const WrappedIframe = ({srcdoc}) => html`
  <div class="${n('wrap')}">
    <iframe
      allowpaymentrequest
      allowfullscreen
      class=${n('iframe')}
      sandbox=${defaultIframeSandbox}
      title="AMP Story Ad Preview"
      srcdoc=${ifDefined(srcdoc)}
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

const setBodyAmpStoryVisible = docStr =>
  docStr.replace(/<(body[^>]*)>/, '<$1 amp-story-visible>');

const insertHttpsCircumventionPatch = docStr =>
  docStr.replace('<head>', `<head><script>${httpsCircumventionPatch}</script>`);

/**
 * Patches an <amp-story> ad document string for REPL support:
 * - Sets `amp-story-visible` attribute on `<body>` for interop.
 * - Monkey-patches `document.createElement()` to circumvent AMP's HTTPS checks.
 * @param {string} docStr
 * @return {string}
 */
const patch = docStr =>
  setBodyAmpStoryVisible(insertHttpsCircumventionPatch(docStr));

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
    this.win = win;
    this.storyIframe_ = untilAttached(element, s('.iframe')).then(
      whenIframeLoaded
    );

    const {iframeReady, writer, srcdoc} = setSrcdocAsyncMultiStrategy(
      win,
      this.storyIframe_,
      getDataTemplate(element).replace('{{ adSandbox }}', defaultIframeSandbox)
    );

    /**
     * Writer for ad iframe content.
     * Defaults to srcdoc writer, uses document.write() when unsupported.
     * TODO: A4A runtime throws replaceState error when using srcdoc.
     * Figure out how to fix, or always use document.write()
     * @private {function(HTMLIframeElement, string):string>}
     */
    this.writeToIframe_ = writer;

    /** @private {!Promise<HTMLIFrameElement>} */
    this.adIframe_ = iframeReady.then(
      iframe => iframe.contentDocument.querySelector('iframe') // xzibit.png
    );

    this.htmlParserEl_ = null;

    render(WrappedIframe({srcdoc}), element);
  }

  /**
   * Updates the current preview with full document HTML.
   * @param {string} dirty Dirty document HTML.
   */
  async update(dirty) {
    // TODO: Expose AMP runtime failures & either:
    // a) purifyHtml() from ampproject/src/purifier
    // b) reject when invalid
    this.writeToIframe_(await this.adIframe_, patch(dirty));
    this.setMetaCtaLabel_(dirty);
  }

  async setMetaCtaLabel_(dirty) {
    const {type, url} = this.extractMetaCta_(dirty);
    const storyCta = (await this.storyIframe_).contentDocument.querySelector(
      '.i-amphtml-story-ad-link'
    );
    storyCta.textContent = CTA_TYPES[type];
    storyCta.setAttribute('href', url);
  }

  extractMetaCta_(dirty) {
    let type = defaultCtaType;
    let url = defaultCtaUrl;
    const matches = dirty.match(metaCtaRe);
    if (matches && matches.length > 0) {
      if (!this.htmlParserEl_) {
        this.htmlParserEl_ = this.win.document.createElement('div');
      }
      this.htmlParserEl_.innerHTML = matches.join('\n');
      const metas = this.htmlParserEl_.querySelectorAll('meta');
      this.htmlParserEl_.innerHTML = null;
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
    return {type, url};
  }
}
