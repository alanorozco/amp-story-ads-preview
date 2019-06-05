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
import {argv} from '../lib/cli';
import colors from 'colors/safe';
import emojiRegex from 'emoji-regex';
import fancyLog from 'fancy-log';

const {blue, magenta, red} = colors;

export function error(...args) {
  fancyLog(red('Error:'), ...args);
}

export function log(...args) {
  if (argv.quiet) {
    return;
  }
  fancyLog(...args);
}

export function fatal(...args) {
  error(...args);
  process.exit(1);
}

const gerund = sentence =>
  sentence.toLowerCase().replace(/(^.*\s|^)([a-z]+ing).*$/i, '$2');

const uncapitalizeFirst = word =>
  word.replace(/^[a-z]/i, letter => (letter ? letter.toLowerCase() : letter));

export async function step(...args) {
  const promissory = args.pop();
  const sentence = args.join(' ');
  const uncapitalizedGerund = uncapitalizeFirst(gerund(sentence));
  log(magenta(`${sentence}...`));
  await promissory();
  log(blue('✨ Done', `${uncapitalizedGerund}.`));
}
