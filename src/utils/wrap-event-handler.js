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
/**
 * @param {function(Event)} handler
 * @param {Object} context
 * @param {Object=} opts - (optional)
 * @param {boolean=} opts.capture - (optional)
 * @param {boolean=} opts.passive - (optional)
 * @param {boolean=} opts.once - (optional)
 * @return {!EventHandler} EventHandler that executes `handler` with `opts`.
 * @private
 */
export function wrapEventHandler(handler, opts = {}) {
  return {
    ...opts,
    handleEvent(e) {
      return handler(e);
    },
  };
}
