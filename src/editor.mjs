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
import {getNamespace} from '../lib/namespace';

const {id, n, s} = getNamespace('editor');

const textNodesToStr = nodes =>
  Array.from(nodes).map(node =>
    node.nodeType == Node.TEXT_NODE ? node.textContent : node
  );

function Preview({html}) {
  return html`
    <div class="${n('preview-wrap')}"></div>
  `;
}

export function PreviewInner({html}, {childNodes}) {
  return html`
    <div class="${n('preview')}">${childNodes}</div>
  `;
}

function Textarea({html}, {content}) {
  return html`
    <div class="${n('textarea-wrap')}"><textarea>${content}</textarea></div>
  `;
}

export function renderEditor(context, {content}) {
  const {html} = context;
  return html`
    <div id="${id}" class="${n('wrap')}">
      ${[Textarea(context, {content}), Preview(context)]}
    </div>
  `;
}

export default class Editor {
  constructor(context) {
    this.context = context;
    this.element = document.getElementById(id);

    this.previewWrap_ = this.element.querySelector(s('.preview-wrap'));
    this.codeMirror_ = this.initCodeMirror_();

    this.attachPreview_();
  }

  initCodeMirror_() {
    const {CodeMirror} = this.context.deps;
    const textarea = this.element.querySelector('textarea');
    const instance = CodeMirror.fromTextArea(textarea, {mode: 'htmlmixed'});
    return instance;
  }

  attachPreview_() {
    this.updatePreview_();
    this.codeMirror_.on('change', this.updatePreview_.bind(this));
  }

  updatePreview_() {
    const {purifyHtml, render} = this.context.deps;
    const previewBody = purifyHtml(this.codeMirror_.getValue());

    // `lit-html` seems to bork when trying to render `TextNodes` as first-level
    // elements of a `NodeList` part. This maps them to strings as a workaround.
    // Non-text `Node`s are left as-is.
    const childNodes = textNodesToStr(previewBody.childNodes);

    render(PreviewInner(this.context, {childNodes}), this.previewWrap_);
  }
}
