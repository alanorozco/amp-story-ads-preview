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

export async function untilAttached(expectedParent, elementPromise) {
  const expected = await elementPromise;

  // If already in the tree, don't initiate a MutationObserver.
  let {parentElement} = expected;
  while (parentElement) {
    if (parentElement == expectedParent) {
      return expected;
    }
    parentElement = parentElement.parentElement;
  }

  // Otherwise wait for attachment.
  const {resolve, promise} = new Deferred();
  let observer = new MutationObserver(mutations => {
    for (const {addedNodes} of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType != Node.ELEMENT_NODE) {
          continue;
        }
        if (node != expected) {
          continue;
        }
        observer.disconnect();
        observer = null; // GC
        resolve(expected);
        return;
      }
    }
  });
  observer.observe(expectedParent, {childList: true, subtree: true});
  return promise;
}
