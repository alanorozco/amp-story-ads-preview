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
import memoize from 'lodash.memoize';

const containsLicenseOrCopyright = memoize(s => /license|copyright/gi.test(s));

const yearFrom = memoize(str => {
  const possiblyYear = str.replace(/^[\s\S]*((19|20)[0-9]{2})[\s\S]*$/m, '$1');
  return possiblyYear.length == str.length ? '' : possiblyYear;
});

let known = new Set();

function normalize(comment) {
  const lines = [
    ' @preserve',
    ...comment.value
      .trim()
      .split('\n')
      .map(line => line.replace(/(^|\n)[\s*]+/gm, '').trim()),
  ];

  const yearOrEmpty = yearFrom(comment.value);
  const delimiter = comment.type == 'CommentBlock' ? '\n' : ' ';
  comment.value = lines.join(delimiter) + delimiter;
  comment.value = yearOrEmpty.length
    ? comment.value.replace(new RegExp(`\s*${yearOrEmpty.toString()}`), '')
    : comment.value;

  comment.type = 'CommentBlock';

  return comment;
}

const normalizeComments = comments =>
  comments
    .map(comment => {
      if (!containsLicenseOrCopyright(comment.value)) {
        return comment;
      }
      const normal = normalize(comment);
      if (known.has(normal.value)) {
        comment.value = ''; // clear
      } else {
        known.add(normal.value);
      }
      return comment;
    })
    .filter(possiblyUndefined => !!possiblyUndefined);

function normalizeLicenses(node) {
  if (node.innerComments) {
    node.innerComments = normalizeComments(node.innerComments);
  }
  if (node.comments) {
    node.comments = normalizeComments(node.comments);
  }
}

export default function() {
  return {
    visitor: {
      Program: {
        enter(path) {
          normalizeLicenses(path.node);
          normalizeLicenses(path.parent);
          path.traverse({
            enter({node}) {
              normalizeLicenses(node);
            },
          });
        },
      },
    },
  };
}
