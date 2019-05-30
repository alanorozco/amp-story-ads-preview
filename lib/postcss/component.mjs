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
import {basename, extname} from 'path';
import {getNamespace} from '../namespace';
import postcss from 'postcss';

export default postcss.plugin('postcss-component', unusedOpts => root => {
  const {file} = root.source.input;
  const withExtension = basename(file);
  const extension = extname(file);
  const id = withExtension.substr(0, withExtension.length - extension.length);
  const {n} = getNamespace(id);

  root.walkAtRules(/component/, rule => {
    process(rule);
    rule.remove();
  });

  function process(rule) {
    const wrap = nodes => ({next: () => nodes[0]});

    while ((rule = rule.next())) {
      if (rule.constructor.name === 'AtRule' && rule.name === 'component') {
        break;
      }

      if (rule.constructor.name === 'AtRule') {
        if (typeof rule.nodes !== 'undefined' && rule.nodes.length) {
          process(wrap(rule.nodes));
        }
      }

      if (rule.constructor.name !== 'Rule') {
        continue;
      }

      rule.selector = rule.selector.replace(
        /[#.][^\s#.%[:]+/g,
        match => match[0] + n(match.slice(1))
      );
    }
  }
});
