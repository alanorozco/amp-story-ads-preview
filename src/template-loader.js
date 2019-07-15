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
import './template-loader.css';
import {assert} from '../lib/assert';
import {classMap} from 'lit-html/directives/class-map';
import {html} from 'lit-html';
import {identity} from './utils/function';
import {redispatchAs} from './utils/events';
import {repeat} from 'lit-html/directives/repeat';
import {successfulFetch} from './utils/xhr';
import {unsafeHTML} from 'lit-html/directives/unsafe-html';
import memoize from 'lodash.memoize';

import {getNamespace} from '../lib/namespace';

const {g, n, s} = getNamespace('template-loader');

export const templateFileUrl = (templateName, filename) =>
  `/static/templates/${templateName}/${filename}`;

const templatePreviewFileUrl = (name, ext) =>
  templateFileUrl(name, `_preview.${ext}`);

export const fetchTemplateContentFactory = win =>
  memoize(async name =>
    (await successfulFetch(win, templateFileUrl(name, 'index.html'))).text()
  );

/**
 * Does not render when not displayed for video autoplay.
 * (See `TemplateSelector`)
 * @param {boolean} isDisplayed
 * @param {Object<string, {previewExt: string, files: Array}>} templates
 * @return {lit-html/TemplateResult}
 */
export const TemplatesPanel = ({isDisplayed, templates}) =>
  isDisplayed
    ? html`
        <div class="${n('panel')}">
          <div class="${g('flex-center')}">
            ${TemplateSelectors(templates)}
          </div>
        </div>
      `
    : '';

function TemplateSelectors(templates) {
  return html`
    ${repeat(Object.keys(templates), identity, name =>
      TemplateSelector({name, ...templates[name]})
    )}
  `;
}

const dispatchSelectTemplate = redispatchAs(g('select-template'));

const TemplateSelector = ({name, previewExt}) => html`
  <div
    class="${n('template')}"
    @click=${dispatchSelectTemplate}
    data-name=${name}
  >
    <div class=${n('preview')}>
      ${TemplatePreview(name, previewExt)}
    </div>
  </div>
`;

const TemplatePreview = (name, ext) =>
  ext == 'mp4' || ext == 'webm'
    ? html`
        <video
          autoplay
          loop
          muted
          src=${templatePreviewFileUrl(name, ext)}
        ></video>
        <!-- Generated from first frame: 'yarn templates-ff' -->
        ${Img(templateFileUrl(name, '_preview_ff.jpg'))}
      `
    : Img(templatePreviewFileUrl(name, ext));

const Img = src => html`
  <img src=${src} />
`;

export const TemplatesJsonScriptOptional = json =>
  !json
    ? ''
    : html`
        <script type="application/json" class=${n('templates')}>
          ${unsafeHTML(json)}
        </script>
      `;

export const parseTemplatesJsonScript = parent =>
  JSON.parse(assert(parent.querySelector(s('script.templates'))).textContent);

const dispatchToggleTemplates = redispatchAs(g('toggle-templates'));

export const ChooseTemplatesButton = (setClassMap = {}) => html`
  <div
    class="${classMap({
      [n('choose-templates')]: true,
      ...setClassMap,
    })}"
    @click=${dispatchToggleTemplates}
  >
    Templates
  </div>
`;
