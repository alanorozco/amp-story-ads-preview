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
import {setSrcdocAsyncMultiStrategy, whenIframeLoaded} from './utils/iframe';
import {untilAttached} from './utils/until-attached';

const {n, s} = getNamespace('amp-story-ad-preview');

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
const WrappedIframe = ({srcdoc = ''}) => html`
  <div class="${n('wrap')}">
    <iframe
      allowpaymentrequest
      allowfullscreen
      class=${n('iframe')}
      sandbox=${defaultIframeSandbox}
      title="AMP Story Ad Preview"
      srcdoc=${srcdoc}
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
  return assert(template);
}

export default class AmpStoryAdPreview {
  constructor(win, element) {
    const {iframeReady, writer, srcdoc} = setSrcdocAsyncMultiStrategy(
      win,
      untilAttached(element, s('.iframe')).then(whenIframeLoaded),
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

    render(WrappedIframe({srcdoc}), this.element);
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
  }
}
