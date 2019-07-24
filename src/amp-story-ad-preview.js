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
<script>
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
  </script>`);

const startingPage = minifyInlineJs(`
<script>
if (window.history && window.history.replaceState) {
  window.history.replaceState(
    {
      ampStoryPageId: '$pageId$',
    },
    ''
  );
}
</script>
<meta charset="utf-8" />
<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
<title>AMP Story</title>
<meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1" />
<link rel="canonical" href="/" />
<style amp-custom>
  .i-amphtml-glass-pane {
    height: 100% !important;
    width: 100% !important;
    z-index: 1 !important;
  }

  .ad {
    border: none;
    width: 100% !important;
    height: 100% !important;
  }

  /* TODO: Include amp-story-auto-ads.css built from runtime */
  amp-story-cta-layer {
    display: block !important;
    position: absolute !important;
    top: 80% !important;
    right: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    margin: 0 !important;
    z-index: 3 !important;
  }

  .i-amphtml-story-ad-link {
    background-color: #ffffff !important;
    border-radius: 20px !important;
    bottom: 32px !important;
    box-shadow: 0px 2px 12px rgba(0, 0, 0, 0.16) !important;
    color: #4285f4 !important;
    font-family: 'Roboto', sans-serif !important;
    font-weight: bold !important;
    height: 36px !important;
    left: 50% !important;
    letter-spacing: 0.2px !important;
    line-height: 36px;
    margin-left: -60px !important;
    position: absolute !important;
    text-align: center;
    text-decoration: none !important;
    width: 120px !important;
  }

  [ad-showing] .i-amphtml-story-ad-link {
    animation-delay: 100ms !important;
    animation-duration: 300ms !important;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
    animation-fill-mode: forwards !important;
    animation-name: ad-cta !important;
  }

  @keyframes ad-cta {
    from {
      opacity: 0;
      font-size: 0px;
      transform: scale(0);
    }

    to {
      opacity: 1;
      font-size: 13px;
      transform: scale(1);
    }
  }

  .i-amphtml-ad-overlay-container {
    height: 24px !important;
    left: 0 !important;
    padding: 14px 0 0 !important;
    pointer-events: none !important;
    position: absolute !important;
    top: 0 !important;
    z-index: 100001 !important;
  }

  [dir='rtl'] .i-amphtml-ad-overlay-container {
    left: auto !important;
    right: 0 !important;
  }

  [desktop]:not([supports-landscape]) .i-amphtml-ad-overlay-container {
    /* On desktop a story page has a with of 45vh. */
    left: calc(50vw - 22.5vh) !important;
    /* And a height of 75 vh. */
    top: 12.5vh !important;
  }

  [dir='rtl'] [desktop] .i-amphtml-ad-overlay-container {
    left: auto !important;
    /* On desktop a story page has a with of 45vh. */
    right: calc(50vw - 22.5vh) !important;
  }

  .i-amphtml-story-ad-attribution {
    color: #ffffff !important;
    font-size: 18px !important;
    font-family: 'Roboto', sans-serif !important;
    font-weight: bold !important;
    letter-spacing: 0.5px !important;
    margin: 0 0 0 16px !important;
    opacity: 0 !important;
    padding: 0 !important;
    visibility: hidden !important;
  }

  [dir='rtl'] .i-amphtml-story-ad-attribution {
    margin-left: 0px !important;
    margin-right: 16px !important;
  }

  [ad-showing][desktop]:not([supports-landscape])
    .i-amphtml-story-ad-attribution {
    /* Have to wait for page to slide in. */
    transition: opacity 0.1s linear 0.3s;
  }

  [ad-showing] .i-amphtml-story-ad-attribution {
    visibility: visible !important;
    opacity: 1 !important;
  }

  .i-amphtml-story-ad-cover {
    text-align: center;
    color: white;
  }
</style>
`);

const setBodyAmpStoryVisible = docStr =>
  docStr.replace(/<(body[^>]*)>/, '<$1 amp-story-visible>');

const insertHttpsCircumventionPatch = docStr =>
  addScriptToHead(docStr, httpsCircumventionPatch);

const addScriptToHead = (docStr, scriptContent) =>
  docStr.replace('<head>', `<head>${scriptContent}`);

const storyNavigationPatch = (docStr, pageId) =>
  addScriptToHead(docStr, startingPage.replace('$pageId$', pageId));

/**
 * Patches an <amp-story> ad document string for REPL support:
 * - Sets `amp-story-visible` attribute on `<body>` for interop.
 * - Monkey-patches `document.createElement()` to circumvent AMP's HTTPS checks.
 * @param {string} docStr
 * @return {string}
 */

const patch = docStr =>
  setBodyAmpStoryVisible(insertHttpsCircumventionPatch(docStr));

const patchOuter = (str, pageId = 'page-1') =>
  storyNavigationPatch(str, pageId);

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
    this.pageId = 'page-1';
    this.isAdMode = false;
    this.storyDoc = getDataTemplate(element).replace(
      '{{ adSandbox }}',
      defaultIframeSandbox
    );
    /** @private @const {!Promise<HTMLIFrameElement>} */
    this.storyIframe_ = untilAttached(element, s('.iframe'))
      .then(whenIframeLoaded)
      .then(iframe => {
        writeToIframe(iframe, patchOuter(this.storyDoc));
        return whenIframeLoaded(iframe);
      });

    /** @private @const {!Promise<HTMLIFrameElement>} */
    this.adIframe_ = awaitSelect(this.storyIframe_, 'iframe'); // xzibit.png

    /** @private @const {!Promise<Element>} */
    this.storyCtaLink_ = awaitSelect(
      this.storyIframe_,
      '.i-amphtml-story-ad-link'
    );

    render(WrappedIframe(), element);
  }

  /**
   * Updates the current preview with full document HTML.
   * @param {string} dirty Dirty document HTML.
   */
  async updateInner(dirty, switchingContext) {
    // TODO: Expose AMP runtime failures & either:
    // a) purifyHtml() from ampproject/src/purifier
    // b) reject when invalid
    // if (this.isAdMode) {
    //   this.pageId = 'cover';
    //   await this.maybeReloadOuterPage(this.storyDoc, 'page-1');
    //   this.isAdMode = !this.isAdMode;
    // }
    if (switchingContext) {
      // Navigate back to ad page
      await this.maybeReloadOuterPage(this.storyDoc, 'page-1');
    }
    this.adIframe_ = await awaitSelect(this.storyIframe_, 'iframe');
    setMetaCtaLink(this.win, dirty, await this.storyCtaLink_);
    writeToIframe(await this.adIframe_, patch(dirty));
  }

  async updateOuter(dirty, dirtyInner, switchingContext) {
    this.storyDoc = dirty;
    await this.maybeReloadOuterPage(dirty, 'cover');
    this.adIframe_ = await awaitSelect(this.storyIframe_, 'iframe');
    if (switchingContext) {
      this.updateInner(dirtyInner);
    }
    this.isAdMode = !this.isAdMode;
  }

  async maybeReloadOuterPage(dirty, pageId) {
    this.pageId = pageId;
    writeToIframe(await this.storyIframe_, patchOuter(dirty, pageId));
    return whenIframeLoaded(await this.storyIframe_);
  }
}
