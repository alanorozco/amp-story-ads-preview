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
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {minifyInlineJs} from './utils/minify-inline-js';
import {restartIframeWithDocument} from './utils/document-html';
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
 * Renders a wrapped iframe that loads an empty document.
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
      src="/static/empty.html"
    >
    </iframe>
  </div>
`;

const httpsCircumventionPatch = minifyInlineJs(`
  (() => {
    const createElement = document.createElement.bind(document);
    document.createElement = function(tagName) {
      const el = createElement(...arguments);
      if (tagName.toLowerCase() == 'a') {
        Object.defineProperty(el, 'protocol', {value: 'https:'});
      }
      return el;
    };
  })();
`);

const setBodyAmpStoryVisible = docStr =>
  docStr.replace(/<(body[^>]*)>/, '<$1 amp-story-visible>');

const insertHttpsCircumventionPatch = docStr =>
  docStr.replace('<head>', `<head><script>${httpsCircumventionPatch}</script>`);

const insertPatches = docStr =>
  setBodyAmpStoryVisible(insertHttpsCircumventionPatch(docStr));

export default class AmpStoryAdPreview {
  constructor(win, element) {
    this.win = win;
    this.element = element;

    this.storyTemplate_ = element
      .getAttribute('data-template')
      .replace('{{ adSandbox }}', defaultIframeSandbox);

    this.iframePromise_ = untilAttached(this.element, s('.iframe'));

    // We're already keeping this value, so let's just remove the attribute to
    // clear memory.
    element.removeAttribute('data-template');

    render(WrappedIframe(), this.element);
  }

  /**
   * Updates the current preview with full document HTML.
   * @param {string} dirty Dirty document HTML.
   * @return {!Promise<Document>}
   *    Resolves with the preview iframe's document once updated.
   */
  async update(dirty) {
    // TODO: Either:
    // a) purifyHtml() from ampproject/src/purifier
    // b) reject when invalid
    const {Blob, URL} = this.win;
    const patched = insertPatches(dirty);
    const adDocBlob = new Blob([patched], {type: 'text/html'});
    const adUrl = URL.createObjectURL(adDocBlob);
    const storyDoc = this.storyTemplate_.replace('{{ adUrl }}', adUrl);
    return restartIframeWithDocument(await this.iframePromise_, storyDoc);
  }
}
