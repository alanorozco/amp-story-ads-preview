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
import {assertArrayIncludes} from '../lib/assert';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {repeat} from 'lit-html/directives/repeat';
import {styleMap} from 'lit-html/directives/style-map';

const identity = v => v;

const {n, g} = getNamespace('viewport');

const viewports = {
  full: {
    name: '(Full)',
    size: {width: '100%', height: '100%'},
  },
  'galaxy-s5': {
    name: 'Galaxy S5',
    size: {width: '360px', height: '640px'},
  },
  'iphone-5': {
    name: 'iPhone 5/SE',
    size: {width: '320px', height: '568px'},
  },
  'iphone-678': {
    name: 'iPhone 6/7/8',
    size: {width: '375px', height: '667px'},
  },
  'iphone-678-plus': {
    name: 'iPhone 6/7/8 Plus',
    size: {width: '414px', height: '736px'},
  },
  'iphone-x': {
    name: 'iPhone X/XS',
    size: {width: '375px', height: '812px'},
  },
  'iphone-xs-max': {
    name: 'iPhone Xs Max',
    size: {width: '414px', height: '896px'},
  },
  'pixel-2': {
    name: 'Pixel 2',
    size: {width: '411px', height: '731px'},
  },
  'pixel-2-xl': {
    name: 'Pixel 2 XL',
    size: {width: '411px', height: '823px'},
  },
};

const viewportIds = Object.keys(viewports);

export const viewportIdFull = 'full';
export const viewportIdDefault = 'iphone-x';

export const validViewportId = viewportId =>
  assertArrayIncludes(viewportIds, viewportId);

export const ViewportSelector = ({selectViewport, viewportId}) => html`
  <select @change=${selectViewport} .value=${viewportId}>
    ${repeat(viewportIds, identity, id =>
      ViewportOption({
        id,
        selected: viewportId == id,
      })
    )}
  </select>
`;

const ViewportOption = ({id, selected}) => html`
  <option value=${id} ?selected=${selected}>
    ${viewports[id].name}
  </option>
`;

export const Viewport = ({viewportId, previewElement}) => html`
  <div
    class=${[g('flex-center'), n('wrap'), n(`wrap-${viewportId}`)].join(' ')}
  >
    <div class=${n('inner')} style=${styleMap(viewports[viewportId].size)}>
      ${previewElement}
    </div>
  </div>
`;
