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
import './editor.css';
import './global.css';
import './monokai.css';
import {getNamespace} from '../lib/namespace';
import AmpStoryAdPreview from './amp-story-ad-preview';
import EditorContent from './editor-content';
import fs from 'fs-extra';

const defaultContent = 'src/editor-default.html';

const {id, n, s} = getNamespace('editor');

export {id};

export async function data() {
  const content = (await fs.readFile(defaultContent)).toString('utf-8');
  return {content};
}

export function render(context, {content}) {
  const {html} = context;
  return html`
    <div id="${id}" class="${n('wrap')}">
      ${[
        Textarea(context, {content}),
        FullPreviewToggle(context),
        Preview(context),
      ]}
    </div>
  `;
}

function Preview({html}) {
  return html`
    <div class="${n('preview')}"></div>
  `;
}

function FullPreviewToggle({html}) {
  return html`
    <div class="${n('toggle')}"></div>
  `;
}

function Textarea({html}, {content}) {
  return html`
    <div class="${n('textarea')}">
      <textarea>${content}</textarea>
    </div>
  `;
}

class Editor {
  constructor(context, element) {
    this.context = context;

    this.editor_ = new EditorContent(
      this.context,
      element.querySelector(s('.textarea'))
    );
    this.preview_ = new AmpStoryAdPreview(
      this.context,
      element.querySelector(s('.preview'))
    );

    this.toggle = element.querySelector(s('.toggle'));
    this.toggle.addEventListener('click', () => {
      this.editor_.fullPreview_(this.editor_.element);
    });

    this.updatePreview_();
    this.editor_.codeMirror_.on('change', () => this.updatePreview_());
  }

  updatePreview_() {
    this.preview_.update(this.editor_.codeMirror_.getValue());
  }
}

export {Editor as ctor};
