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
import {jsMinifyConfig} from '../js-minify-config';
import {minify} from 'terser';

const transformableFunction = 'minifyInlineJs';

/**
 * Minifies inline JS code snippets for production.
 *
 * These are explicitly set via `minifyInlineJs`.
 *
 * So:
 *   const myJs = minifyInlineJs(`
 *     function myUnminifiedFunction(myArg) {
 *        console.log(myArg);
 *     }
 *   `)
 *
 * Becomes:
 *   const myJs = 'function a(b){console.log(b)}';
 */
export default function({types: t}) {
  function staticStrFrom(literal) {
    // String literals simply have `.value`
    if (t.isStringLiteral(literal)) {
      return literal.value;
    }

    // If the template literal is dynamic, we can't safely minify.
    // Return null to handle afterwards.
    if (literal.expressions.length > 0) {
      return null;
    }

    // There is only one quasi when there aren't expressions.
    // This is the static string we want.
    return literal.quasis[0].value.cooked;
  }

  function replacementLiteralFrom(literal) {
    const str = staticStrFrom(literal);

    // If there's no static string, simply replace with its value literal.
    if (!str) {
      return literal;
    }

    // Otherwise minify.
    const {code} = minify(str, jsMinifyConfig);
    return t.stringLiteral(code);
  }

  return {
    visitor: {
      CallExpression(path) {
        const {node} = path;

        if (!t.isIdentifier(node.callee, {name: transformableFunction})) {
          return;
        }

        const [valueLiteral] = node.arguments;

        // Dynamic values cannot be minified.
        // We could look for other literals in the scope when identifiers, but
        // eh, not worth it.
        if (
          !t.isStringLiteral(valueLiteral) &&
          !t.isTemplateLiteral(valueLiteral)
        ) {
          return;
        }

        path.replaceWith(replacementLiteralFrom(valueLiteral));
      },
    },
  };
}
