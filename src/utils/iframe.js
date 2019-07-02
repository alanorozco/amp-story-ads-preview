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

/** @private {?boolean} */
let srcdocSupported = null;

/**
 * Returns `true` if srcdoc is supported. https://caniuse.com/#search=srcdoc
 * @return {boolean}
 */
export function isSrcdocSupported() {
  if (srcdocSupported === null) {
    srcdocSupported = 'srcdoc' in HTMLIFrameElement.prototype;
  }
  return srcdocSupported;
}

/**
 * Writes content to given iframe using document.{open, write, close}
 * @param {!HTMLIFrameElement} iframe
 * @param {string} content
 */
export function writeToIframe(iframe, content) {
  iframe.src = 'about:blank';
  const childDoc = iframe.contentWindow.document;
  childDoc.open();
  childDoc.write(content);
  // With document.write, `iframe.onload` arrives almost immediately, thus
  // we need to wait for child's `window.onload`.
  childDoc.close();
  return whenIframeLoaded(iframe);
}

/**
 * Writes content to given iframe using srcdoc attribute.
 * @param {!HTMLIFrameElement} iframe
 * @param {string} content
 */
export function writeToSrcdoc(iframe, content) {
  iframe.srcdoc = content;
  return whenIframeLoaded(iframe);
}

export async function whenIframeLoaded(iframe) {
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
