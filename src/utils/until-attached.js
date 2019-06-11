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
 * @param {Element} parent
 * @param {Element|string} elementOrSelector
 * @return {?Element}
 */
function insideTree(parent, elementOrSelector) {
  if (typeof elementOrSelector == 'string') {
    return parent.querySelector(elementOrSelector);
  }

  let {parentElement} = elementOrSelector;
  while (parentElement) {
    if (parentElement == parent) {
      return elementOrSelector;
    }
    parentElement = parentElement.parentElement;
  }

  return null;
}

/**
 * @param {Element} candidate
 * @param {Element|string} elementOrSelector
 * @return {boolean}
 */
const isExpected = (candidate, elementOrSelector) =>
  typeof elementOrSelector == 'string'
    ? candidate.matches(elementOrSelector)
    : candidate == elementOrSelector;

/**
 * Resolves once `elementPromiseOrSelector` has been attached to `parent`.
 * @param {Element} parent
 * @param {Promise<Element>|Element|string} elementPromiseOrSelector
 * @return {Promise<Element>}
 */
export async function untilAttached(parent, elementPromiseOrSelector) {
  const elementOrSelector = await elementPromiseOrSelector;

  // If already in the tree, don't initiate a MutationObserver.
  const foundInTree = insideTree(parent, elementOrSelector);
  if (foundInTree) {
    return Promise.resolve(foundInTree);
  }

  // Otherwise wait for attachment.
  const {resolve, promise} = new Deferred();

  let observer = new MutationObserver(mutations => {
    for (const {addedNodes} of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType != Node.ELEMENT_NODE) {
          continue;
        }
        if (!isExpected(node, elementOrSelector)) {
          continue;
        }
        observer.disconnect();
        observer = null; // GC
        resolve(node);
        return;
      }
    }
  });

  observer.observe(parent, {childList: true, subtree: true});

  return promise;
}
