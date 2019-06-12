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

/** Global app-scoped prefix for every app/component-scoped name. */
export const globalPrefix = 'amp-sap';

/**
 * @param {string} componentName
 * @return {!Object<string, (string|function(string):string)>} namespace
 * @return {string} namespace.id
 *    Unique id for component. This is namespaced, so:
 *    ```
 *    const {id} = getNamespace('my-component');
 *    id // "amp-sap_my-component"
 *    ```
 * @return {function(string):string} namespace.g
 *    Namespaces an id or class under the global app namespace:
 *    ```
 *    const {g} = getNamespace('my-component');
 *    g('flex') // "amp-sap_flex", no "my-component"
 *    ```
 * @return {function(string):string} namespace.n
 *    Namespaces an id or class under the component namespace:
 *    ```
 *    const {n} = getNamespace('my-component');
 *    n('my-child') // "amp-sap_my-component_my-child"
 *    ```
 * @return {function(string):string} namespace.s
 *    Namespaces a selector under the component namespace:
 *    ```
 *    const {s} = getNamespace('my-component');
 *    s('.my-child') // ".amp-sap_my-component_my-child"
 *    s('body .my-child') // "body .amp-sap_my-component_my-child"
 *    ```
 */
export const getNamespace = componentName =>
  namespace(globalName(componentName));

/**
 * Namespaces an id or class under the global app namespace:
 * ```
 * globalName('flex') // "amp-sap_flex"
 * ```
 * @param {string} name
 * @return {string}
 */
const globalName = name => `${globalPrefix}_${name}`;

/**
 * Regex for id or classnames in selectors.
 * The following would match ['.my-match', '#another-match']:
 * ```
 * 'body .my-match #another-match'.match(idOrClassInSelectorRe);
 * ```
 */
const idOrClassInSelectorRe = /[#.][^\s#.%[:]+/g;

/**
 * Namespaces a selector under a `namer` function for id or classes.
 * ```
 * const prefixBlah = name => `blah__${name}`;
 * replaceSelector('body .flex', prefixBlah) // "body .blah__flex"
 * ```
 * Do not use this under a component context. Use `getNamespace` instead.
 * This is used for `getNamespace()` object creation and `@app` CSS transforms.
 * @param {string} selector
 * @param {function(string):string} namer
 * @return {string}
 */
export const replaceSelectorName = (selector, namer) =>
  selector.replace(
    idOrClassInSelectorRe,
    match => match[0] + namer(match.slice(1))
  );

/**
 * @param {string} id
 * @return {!Object} namespace
 * @return {string} namespace.id
 *    Unique id for component.
 * @return {function(string):string} namespace.g
 *    Namespaces an id or class under the global app namespace.
 * @return {function(string):string} namespace.n
 *    Namespaces an id or class under the component namespace.
 * @return {function(string):string} namespace.s
 *    Namespaces a selector under the component namespace.
 */
function namespace(id) {
  /** @type {function(string):string)} */
  const n = name => `${id}_${name}`;

  /** @type {function(string):string)} */
  const s = selector => replaceSelectorName(selector, n);

  return {id, g: globalName, n, s};
}
