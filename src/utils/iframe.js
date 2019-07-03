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
 * Passes `srcdoc` through when supported, otherwise waits for and writes to the
 * iframe.
 *
 * Result properties are for the callee to handle the iframe based on `srcdoc`
 * support. If the `srcdoc` property is returned, it should be set as an
 * attribute on the rendered <iframe>.
 *
 * @param {Window} win
 * @param {Promise<HTMLIframeElement>} iframeReady
 *   Should resolve when the iframe is attached and loaded.
 *   When `document.write()`ing, the frame will load once more and this will
 *   be chain-resolved into the `iframeReady` result property.
 *   Otherwise said property simply passes through.
 * @param {string} srcdoc Document string to set.
 * @return {{
 *   iframeReady: Promise<HTMLIframeElement>,
 *   srcdoc: (string|undefined),
 *   writer: function(HTMLIframeElement, string):string
 * }}
 *  - `iframeReady` resolves when ready for further updates.
 *  - `srcdoc` to set on template
 *    (undefined if unnecessary, since we're using `document.write()` instead.)
 *  - `writer` is to be used for further updates. Takes `(iframe, docStr)`.
 */
export const setSrcdocAsyncMultiStrategy = (win, iframeReady, srcdoc) =>
  // https://caniuse.com/#search=srcdoc
  'srcdoc' in win.HTMLIFrameElement.prototype
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
