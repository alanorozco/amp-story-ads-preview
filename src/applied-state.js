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
    set(obj) {
      const isSet = Reflect.set(...arguments);
      if (isSet) {
        applier(obj);
      }
      return isSet;
    },
  });

/**
 * Same as `appliedState`, except:
 *
 * - batches subsequent `renderer` calls into a single `renderer(finalState)`
 * - schedules an intial call to `renderer(initialState)`
 *
 * This is useful for component root rehydration. A component calling from its
 * constructor:
 *
 * ```
 *  this.state_ = renderState(win, state => this.render_(state), {
 *    foo: 'bar',
 *  });
 * ```
 *
 * ...would result in an automatic call to `this.render_({foo: 'bar'})`.
 *
 * Since this batches `renderer` calls until the next available microtask, its
 * safe to modify the state several times within the same frame and assume that
 * `renderer` will only be called once:
 *
 * ```
 *  const state = renderState(win, renderer, {foo: 'bar'});
 *
 *  state_.foo = 'baz';
 *  // now {foo: 'baz'}
 *
 *  state_.myObj = {a: 'one', b: 'two'};
 *  // now {foo: 'baz', {a: 'one', b: 'two'}}
 *
 *  delete state_.myObj.a;
 *  // now {foo: 'baz', {b: 'two'}}
 *
 *  // would transparently result in a single call to:
 *  // rendererer({foo: 'baz', {b: 'two'}})
 * ```
 * If a state property is resolved asynchronously, two calls to `renderer`
 * should be assumed, before and after resolution.
 *
 * ⚠️ Warning ⚠️
 *
 * This is not applied recursively. For deep trees, the following would not
 * result in an updated call to `renderer(state)`:
 *
 * ```
 * const state = renderState(win, renderer, {
 *   foo: {
 *     bar: 'myObsoleteValue',
 *   },
 * });
 *
 * // renderer({foo: {bar: 'myObsoleteValue'}}) is scheduled for call.
 *
 * state.foo.bar = 'myNewValue'; // this does nothing!
 *
 * // renderer(obsoleteState) is called as microtask.
 * ```
 *
 * If `renderer` needs to be called when modifying a deep value, set its
 * modifyable objects explicitly.
 *
 * See notes on recursion in {@see appliedState} for examples.
 *
 * @param {!Window} win
 * @param {function(Object)} renderer
 * @param {!Object} initialState
 */
export function renderState(win, renderer, initialState) {
  renderer.__microTask = renderer.__microTask || null;
  const applyRender = state => {
    if (renderer.__microTask) {
      win.clearTimeout(renderer.__microTask);
    }
    renderer.__microTask = win.setTimeout(() => {
      renderer(state);
      delete renderer.__microTask; // GC
    }, 0);
  };
  const state = appliedState(applyRender, initialState);
  applyRender(state);
  return state;
}
