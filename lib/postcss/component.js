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
import {getNamespace} from '../namespace';
import {withoutExtension} from '../path';
import postcss from 'postcss';

/** Namespaces selectors for a component by `@component` rule. */
export default postcss.plugin('postcss-component', unusedOpts => root => {
  const {file} = root.source.input;
  const {s} = getNamespace(withoutExtension(file));

  root.walkAtRules(/component/, rule => {
    process(rule);
    rule.remove();
  });

  const wrapForProcessing = nodes => ({next: () => nodes[0]});

  function process(rule) {
    while ((rule = rule.next())) {
      if (rule.constructor.name == 'AtRule' && rule.name == 'component') {
        break;
      }

      if (
        rule.nodes !== undefined &&
        rule.nodes.length &&
        rule.constructor.name == 'AtRule'
      ) {
        process(wrapForProcessing(rule.nodes));
      }

      if (rule.constructor.name != 'Rule') {
        continue;
      }

      rule.selector = s(rule.selector);
    }
  }
});
