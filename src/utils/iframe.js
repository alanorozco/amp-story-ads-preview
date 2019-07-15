/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {Deferred} from '../../vendor/ampproject/amphtml/src/utils/promise';

/**
 * Writes content to given iframe using document.{open, write, close}
 * @param {!HTMLIFrameElement} iframe
 * @param {string} srcdoc
 * @return {string} (for compatibility with srcdoc writer, not important atm.)
 */
function writeToIframe(iframe, srcdoc) {
  iframe.src = 'about:blank';
  const childDoc = iframe.contentWindow.document;
  childDoc.open();
  childDoc.write(srcdoc);
  childDoc.close();
  return srcdoc;
}

/**
 * Returns a promise that resolves on the next `load`
 * event from the given iframe.
 * @param {!HTMLIFrameElement} iframe
 * @return {Promise<HTMLIFrameElement>}
 */
export function whenIframeLoaded(iframe) {
  const {promise, resolve} = new Deferred();
  iframe.addEventListener(
    'load',
    () => {
      resolve(iframe);
    },
    {once: true}
  );
  return promise;
}

/**
 * Writes to an async iframe when dynamic `srcdoc` is unsupported, and
 * establishes dynamic iframe writing support regardless.
 *
 * Result properties are for the callee to handle the iframe based on `srcdoc`
 * support.
 *
 * @param {Window} win
 * @param {Promise<HTMLIframeElement>} iframeReady
 *   Should resolve when the iframe is attached and loaded.
 *   When `document.write()`ing, the iframe will load once more and
 *   chain-resolve into the homonymous property. Otherwise passed through.
 * @param {string} srcdoc
 *   Set on <iframe> once resolved if platform lacks `srcdoc` support.
 *   Otherwise passed through as a result property in order to set as an
 *   attribute on the rendered <iframe>.
 * @return {{
 *   iframeReady: Promise<HTMLIframeElement>,
 *   srcdoc: (string|undefined),
 *   writer: function(HTMLIframeElement, string):string
 * }}
 *  - `iframeReady` resolves when ready for further updates.
 *  - `srcdoc` to set as attribute on `<iframe>` (undefined if unnecessary.)
 *  - `writer` to be used for further updates.
 *    Takes `(iframe, srcdoc)` and returns `srcdoc` for chaining.
 */
export function setSrcdocAsyncMultiStrategy(win, iframeReady, srcdoc) {
  // https://caniuse.com/#search=srcdoc
  return false && 'srcdoc' in win.HTMLIFrameElement.prototype
    ? {
        srcdoc,
        iframeReady,
        writer: (iframe, srcdoc) => (iframe.srcdoc = srcdoc),
      }
    : {
        // Writing after attachment, shouldn't set actual srcdoc attribute.
        iframeReady: iframeReady.then(iframe => {
          writeToIframe(iframe, srcdoc);
          return whenIframeLoaded(iframe);
        }),
        writer: writeToIframe,
      };
}
