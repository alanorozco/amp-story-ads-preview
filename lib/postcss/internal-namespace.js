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
import {getNamespace, replaceSelectorName} from '../namespace';
import {withoutExtension} from '../path';
import postcss from 'postcss';

const namespaceAtRules = ['component', 'app'];
const namespaceAtRulesNamesRe = new RegExp(namespaceAtRules.join('|'));

/**
 * Namespaces selectors:
 * - for the global app namespace by `@app` rule.
 * - for an app component by `@component` rule.
 */
export default postcss.plugin('postcss-internal-namespace', unused => root => {
  const componentName = withoutExtension(root.source.input.file);
  const {g, n} = getNamespace(componentName);

  let namer;

  root.walkAtRules(namespaceAtRulesNamesRe, rule => {
    // Use `globalName` for `@app` scoping or `n` for `@component` scoping.
    namer = rule.name == 'app' ? g : n;
    process(rule);
    rule.remove();
  });

  function process(rule) {
    while ((rule = rule.next())) {
      // If another @component or @app rule is found below, exit loop so that
      // it's processed by the walker.
      if (
        rule.constructor.name == 'AtRule' &&
        namespaceAtRules.includes(rule.name)
      ) {
        break;
      }

      // Nest one level for rules like `@media`.
      if (
        rule.nodes !== undefined &&
        rule.nodes.length &&
        rule.constructor.name == 'AtRule'
      ) {
        // fake next() interface for local process()
        process({next: () => rule.nodes[0]});
      }

      // Ignore non-rules instances.
      if (rule.constructor.name != 'Rule') {
        continue;
      }

      // Replace selector with current scope, if @app using a global-app name,
      // if @component, namespace via component prefix.
      rule.selector = replaceSelectorName(rule.selector, namer);
    }
  }
});
