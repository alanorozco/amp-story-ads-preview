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

const transformableFunction = 'assert';

const messageArgPos = 1;

export default function({types: t}) {
  return {
    visitor: {
      FunctionDeclaration(path) {
        const {node} = path;

        // Transform "assert(truthy, message = 'foo')" into "assert(truthy)"
        if (!t.isIdentifier(node.id, {name: transformableFunction})) {
          return;
        }
        if (node.params.length != messageArgPos + 1) {
          return;
        }
        if (!t.isAssignmentPattern(node.params[messageArgPos])) {
          return;
        }
        if (!t.isStringLiteral(node.params[messageArgPos].right)) {
          return;
        }

        node.params.length = messageArgPos;

        // Transform "throw new Error(message)" into "throw new Error()"
        path.traverse({
          ThrowStatement({node}) {
            if (!t.isNewExpression(node.argument)) {
              return;
            }
            if (!t.isIdentifier(node.argument.callee, {name: 'Error'})) {
              return;
            }
            if (!node.argument.arguments) {
              return;
            }
            node.argument.arguments.length = 0;
          },
        });
      },

      CallExpression({node}) {
        // Transform "assert(expr, 'Message string')" into "assert(expr)"
        if (!t.isIdentifier(node.callee, {name: transformableFunction})) {
          return;
        }
        node.arguments.length = messageArgPos;
      },
    },
  };
}
