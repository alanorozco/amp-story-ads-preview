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
 * @param {string} content
 * @return {string} (for compatibility with srcdoc writer, not important)
 */
function writeToIframe(iframe, content) {
  iframe.src = 'about:blank';
  const childDoc = iframe.contentWindow.document;
  childDoc.open();
  childDoc.write(content);
  childDoc.close();
  return content;
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
 * Waits for and writes to an iframe when srcdoc is unsupported.
 * Otherwise, passes srcdoc through.
 *
 * @param {Promise<HTMLIframeElement>} iframeReady
 * @param {string} srcdoc
 * @return {{
 *   iframeReady: Promise<HTMLIframeElement>,
 *   srcdoc: (string|undefined),
 *   writer: function(HTMLIframeElement, string):Promise<HTMLIFrameElement>
 * }}
 *  - `iframeReady` resolves when ready for further updates.
 *  - `srcdoc` to set on template (undefined if unnecessary.)
 *  - `writer` is meant for further updates.
 */
export const writeIframeMultiStrategy = (iframeReady, srcdoc) =>
  // https://caniuse.com/#search=srcdoc
  'srcdoc' in HTMLIFrameElement.prototype
    ? {
        srcdoc,
        iframeReady,
        writer: (iframe, content) => (iframe.srcdoc = content),
      }
    : {
        // Writing after attachment, no need to set srcdoc.
        iframeReady: iframeReady.then(iframe => {
          writeToIframe(iframe, srcdoc);
          return whenIframeLoaded(iframe);
        }),
        writer: writeToIframe,
      };
