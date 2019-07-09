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
import {dispatchCustomEvent} from './utils/events';
import {getNamespace} from '../lib/namespace';
import {hintIgnoreEnds} from './hints';
import codemirror from '../lib/runtime-deps/codemirror';

const {g} = getNamespace('wrapped-codemirror');

const updateDebounceRateMs = 300;
const hintDebounceRateMs = 150;

const passthruMethods = ['on', 'setValue', 'getValue', 'refresh'];

export class WrappedCodemirror {
  constructor(win, elementResolver, opts = {}) {
    this.win = win;
    this.element_ = null;

    this.updateOnChangesTimeout_ = null;
    this.hintTimeout_ = null;

    this.instance_ = new codemirror(
      element => {
        this.element_ = element;
        elementResolver(element);
      },
      {
        ...opts,
        mode: 'text/html',
        selectionPointer: true,
        styleActiveLine: true,
        lineNumbers: false,
        showCursorWhenSelecting: true,
        cursorBlinkRate: 300,
        autoCloseBrackets: true,
        autoCloseTags: true,
        gutters: ['CodeMirror-error-markers'],
        extraKeys: {'Ctrl-Space': 'autocomplete'},
        hintOptions: {
          completeSingle: false,
        },
        theme: 'monokai',
      }
    );

    this.attachEvents_();
    this.setPassthruMethods_();
  }

  /**
   * Stolen from @ampproject/docs/playground/src/editor/editor.js
   * (Editor#createCodeMirror)
   * @private
   */
  attachEvents_() {
    const {clearTimeout, setTimeout} = this.win;

    this.instance_.on('changes', () => {
      if (this.updateOnChangesTimeout_) {
        clearTimeout(this.updateOnChangesTimeout_);
      }
      this.updateOnChangesTimeout_ = setTimeout(() => {
        dispatchCustomEvent(this.element_, g('update-preview'));
      }, updateDebounceRateMs);
    });

    this.instance_.on('inputRead', (editor, change) => {
      if (this.hintTimeout_) {
        clearTimeout(this.hintTimeout_);
      }
      if (change.origin !== '+input') {
        return;
      }
      if (change && change.text && hintIgnoreEnds.has(change.text.join(''))) {
        return;
      }
      this.hintTimeout_ = setTimeout(() => {
        if (editor.state.completionActive) {
          return;
        }
        const cur = editor.getCursor();
        const token = editor.getTokenAt(cur);
        const isCss = token.state.htmlState.context.tagName === 'style';
        const isTagDeclaration = token.state.htmlState.tagName;
        const isTagStart = token.string === '<';
        if (isCss || isTagDeclaration || isTagStart) {
          codemirror.commands.autocomplete(editor);
        }
      }, hintDebounceRateMs);
    });
  }

  setPassthruMethods_() {
    for (const method of passthruMethods) {
      this[method] = function() {
        return this.instance_[method].apply(this.instance_, arguments);
      };
    }
  }

  getHintHtmlSchema() {
    return codemirror.htmlSchema;
  }
}
