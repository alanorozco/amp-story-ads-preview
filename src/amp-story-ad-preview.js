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
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {
  isSrcdocSupported,
  whenIframeLoaded,
  writeToIframe,
  writeToSrcdoc,
} from './utils/iframe';
import {minifyInlineJs} from './utils/minify-inline-js';
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
const WrappedIframe = ({storyTemplate, useSourcedoc}) => html`
  <div class="${n('wrap')}">
    <iframe
      allowpaymentrequest
      allowfullscreen
      class=${n('iframe')}
      sandbox=${defaultIframeSandbox}
      title="AMP Story Ad Preview"
      srcdoc=${useSourcedoc ? storyTemplate : ''}
    >
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

const insertPatches = docStr =>
  setBodyAmpStoryVisible(insertHttpsCircumventionPatch(docStr));

export default class AmpStoryAdPreview {
  constructor(win, element) {
    this.win = win;
    this.element = element;

    /** @private {boolean} */
    this.useSourcedoc_ = true;

    /**
     * Controls which method is used to render. Defaults to srcdoc, but
     * is set to doc write when srcdoc is unsupported.
     * @private {function}
     */
    this.renderer_ = this.renderWithSrcdoc_;

    const {promise, resolve} = new Deferred();
    /** @private {!function} */
    this.adIframeResolver_ = resolve;
    /** @private {!Promise} */
    this.adIframe_ = promise;

    /** @private {string} */
    this.storyTemplate_ = element
      .getAttribute('data-template')
      .replace('{{ adSandbox }}', defaultIframeSandbox);

    /** @private {!Promise} */
    this.iframePromise_ = untilAttached(this.element, s('.iframe'));

    this.determineIframeStrategy_();

    // We're already keeping this value, so let's just remove the attribute to
    // clear memory.
    element.removeAttribute('data-template');

    render(
      WrappedIframe({
        storyTemplate: this.storyTemplate_,
        useSourcedoc: this.useSourcedoc_,
      }),
      this.element
    );
  }

  /**
   * Updates the current preview with full document HTML.
   * @param {string} dirty Dirty document HTML.
   * @return {!Promise<Document>}
   *    Resolves with the preview iframe's document once updated.
   */
  async update(dirty) {
    // TODO: Expose AMP runtime failures & either:
    // a) purifyHtml() from ampproject/src/purifier
    // b) reject when invalid
    const patched = insertPatches(dirty);
    return this.renderer_(await this.adIframe_, patched);
  }

  /**
   * Checks to see if srcdoc is supported. If so, outer frame is rendered
   * by lit, so we are ready to get ad frame. Else, we must manually
   * render the outer frame first.
   * @private
   */
  determineIframeStrategy_() {
    if (isSrcdocSupported()) {
      this.getAdIframe_();
      return;
    }

    this.useSourcedoc_ = false;
    this.writeOuterIframe();
  }

  /**
   * Responsible for resolving the ad iframe promise with a ref to the
   * iframe when ready. Must wait for outer frame (story) to render.
   * @private
   */
  async getAdIframe_() {
    const outerIframe = await whenIframeLoaded(await this.iframePromise_);
    const adFrame = outerIframe.contentDocument.querySelector('iframe');
    this.adIframeResolver_(adFrame);
  }

  /**
   * When srcdoc is not supported we control rendering of outer frame
   * without lit. Also sets the appropriate renderer for future use.
   */
  async writeOuterIframe() {
    this.renderer_ = this.renderWithDocWrite_;
    // First load in non-srcdoc case is an empty iframe.
    const outerIframe = await whenIframeLoaded(await this.iframePromise_);
    writeToIframe(outerIframe, this.storyTemplate);
    // Now the ad iframe can wait for the right load event.
    this.getAdIframe_();
  }

  /**
   * Default rendering method. Uses srcdoc=content.
   * @param {!HTMLIFrameElement} iframe
   * @param {string} content
   */
  renderWithSrcdoc_(iframe, content) {
    // TODO: A4A runtime throws replaceState error when using srcdoc.
    // Figure out how to fix, or always use renderWithDocWrite.
    writeToSrcdoc(iframe, content);
  }

  /**
   * Used when srcdoc is not supported.
   * @param {!HTMLIFrameElement} iframe
   * @param {string} content
   */
  renderWithDocWrite_(iframe, content) {
    writeToIframe(iframe, content);
  }
}
