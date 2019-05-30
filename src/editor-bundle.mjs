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
import {html, nothing, render} from 'lit-html';
import {ifDefined} from 'lit-html/directives/if-defined';
import {purifyHtml} from '../amphtml/src/purifier';
import CodeMirror from 'codemirror';
import Editor from './editor';

import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/edit/closetag.js';
import 'codemirror/addon/hint/css-hint.js';
import 'codemirror/addon/hint/html-hint.js';
import 'codemirror/addon/hint/show-hint.js';
import 'codemirror/addon/selection/active-line.js';
import 'codemirror/addon/selection/selection-pointer.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';

// These are extracted into dist/editor-bundle.css
import './editor.css';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/lib/codemirror.css';

const directives = {ifDefined};

new Editor({
  html,
  nothing,
  directives,
  win: self,
  deps: {render, CodeMirror, purifyHtml},
});
