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
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {styleMap} from 'lit-html/directives/style-map';

const {n, g} = getNamespace('viewport');

const viewports = {
  full: {
    name: '(Full)',
    size: {width: '100%', height: '100%'},
  },
  'iphone-x': {
    name: 'iPhone X/XS',
    size: {width: '375px', height: '812px'},
  },
};

export const viewportIdFull = 'full';
export const viewportIdDefault = 'iphone-x';

export const Viewport = ({viewportId, previewElement}) => html`
  <div
    class=${[g('flex-center'), n('wrap'), n(`wrap-${viewportId}`)].join(' ')}
  >
    <div class=${n('inner')} style=${styleMap(viewports[viewportId].size)}>
      ${previewElement}
    </div>
  </div>
`;
