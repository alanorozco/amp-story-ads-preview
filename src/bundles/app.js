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
import {default as Editor, editorId} from '../editor';
import {purifyHtml} from '../../amphtml/src/purifier';
import CodeMirror from 'codemirror';
import context from '../context';

import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/hint/css-hint';
import 'codemirror/addon/hint/html-hint';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/selection/selection-pointer';
import 'codemirror/mode/css/css';
import 'codemirror/mode/htmlmixed/htmlmixed';

import '../app.css';
import '../editor.css';

const editorElement = context.win.document.getElementById(editorId);
new Editor(context, {CodeMirror, purifyHtml}, editorElement);
