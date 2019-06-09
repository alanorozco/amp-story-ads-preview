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

export const appliedState = (applier, state) =>
  new Proxy(state, {
    deleteProperty(target, prop) {
      if (!(prop in target)) {
        return;
      }
      delete target[prop];
      applier(state);
    },
    set() {
      const isSet = Reflect.set(...arguments);
      if (isSet) {
        applier(state);
      }
      return isSet;
    },
  });
