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
import './viewport.css';
import {classMap} from 'lit-html/directives/class-map';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {styleMap} from 'lit-html/directives/style-map';

const {n} = getNamespace('viewport');

const viewports = {
  full: {name: '(Full)', size: {width: '100%', height: '100%'}},
  'iphone-x': {name: 'iPhone X', size: {width: '375px', height: '812px'}},
};

export const viewportIdFull = 'full';
export const viewportIdDefault = 'iphone-x';

const viewportIds = Object.keys(viewports);

export const ViewportSelector = ({selectViewport, viewportId}) => html`
  <div class="-flex-center ${n('select')}">
    <select @change=${selectViewport} .value=${viewportId}>
      ${viewportIds.map(id =>
        Option({
          value: id,
          selected: viewportId == id,
          text: viewports[id].name,
        })
      )}
    </select>
  </div>
`;

const Option = ({value, selected = false, text}) => html`
  <option value=${value} ?selected=${selected}>
    ${text}
  </option>
`;

export const Viewport = ({viewportId, previewElement, defaultPreview}) => html`
  <div
    class=${classMap({
      '-flex-center': true,
      [n('wrap')]: true,
      [n(`wrap-${viewportId}`)]: true,
    })}
  >
    <div class=${n('inner')} style=${styleMap(viewports[viewportId].size)}>
      ${previewElement || defaultPreview()}
    </div>
  </div>
`;
