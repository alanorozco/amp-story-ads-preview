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
 * Creates a proxy object that calls `applier(state)` when one of its properties
 * is modified or deleted.
 *
 * ⚠️ Warning ⚠️
 *
 * This is not applied recursively. For deep trees, the following would not
 * result in a call to `applier(state)`:
 *
 * ```
 * const state = appliedState(applier, {
 *   foo: {
 *     bar: 'myValue',
 *   },
 * });
 *
 * state.foo.bar = 'myNewValue'; // this does nothing!
 * ```
 *
 * If `applier` needs to be called when modifying a deep value, set its
 * modifyable objects explicitly:
 *
 * ```
 *  // We're dropping the `state` argument since we want to affect root scope.
 *  // Instead we call `applier` using the object returned by `appliedState`.
 *  const rootLevelApplier = () => applier(rootState);
 *
 *  const rootState = appliedState(rootLevelApplier, {
 *    foo: appliedState(rootLevelApplier, {
 *      bar: 'myValue',
 *    }),
 *  });
 *
 *  state.foo.bar = 'myNewValue'; // calls `applier({foo: {bar: 'newValue'}})`
 * ```
 *
 * When doing the same but its sub-states know how to apply themselves, it's a
 * good idea to slice the appliers for performance. For example:
 *
 * ```
 *  function renderAll({foo: {bar}}) {
 *    // knows how to render the entire tree.
 *  }
 *
 *  function renderFoo({bar}) {
 *    // knows how to render just taking the subtree from `rootState.foo`
 *  }
 *
 *  const state = appliedState(renderAll, {
 *    foo: appliedState(renderFoo, {
 *      bar: 'myValue',
 *    }),
 *  });
 *
 *  // calls `renderFoo({bar: 'myNewValue'})`
 *  state.foo.bar = 'myNewValue';
 *
 *  // calls renderAll({s: 'something', foo: {bar: 'myNewValue'}})
 *  state.s = 'something';
 * ```
 *
 * @param {function(*)} applier
 * @param {Object} state
 * @return {Proxy}
 */
export const appliedState = (applier, state) =>
  new Proxy(state, {
    deleteProperty(target, prop) {
      if (!(prop in target)) {
        return true;
      }
      delete target[prop];
      applier(target);
      return true;
    },
    set(target) {
      const isSet = Reflect.set(...arguments);
      if (isSet) {
        applier(target);
      }
      return isSet;
    },
  });

/**
 * Creates an applier for `appliedState` that subsequent `applier` calls into a
 * single `applier(finalState)`.
 *
 * @param {!Window} win
 * @param {function(Object)} applier
 */
export const batchedApplier = (win, applier) => state => {
  if (applier.__applyMicroTask) {
    win.clearTimeout(applier.__applyMicroTask);
  }
  applier.__applyMicroTask = win.setTimeout(() => {
    applier(state);
    delete applier.__applyMicroTask; // GC
  }, 0);
};