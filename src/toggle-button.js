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
import './toggle-button.css';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {redispatchAs} from './utils/events';

const {g, n} = getNamespace('toggle-button');

const dispatchToggle = redispatchAs(g('toggle'));

/**
 * Toggle button to expand/collapse panels.
 * This assumes the panel to collapse is at the left side of the button, since
 * it renders "<" or ">" depending on whether it's open.
 * @param {Object} data
 * @param {boolean=} data.isOpen
 * @param {string} data.name
 * @return {lit-html/TemplateResult}
 */
export const ToggleButton = ({isOpen, name}) => html`
  <div
    class=${[g('flex-center'), n('button')].join(' ')}
    @click=${dispatchToggle}
    data-name=${name}
  >
    <div class=${n('fake-icon')}>${isOpen ? '<' : '>'}</div>
  </div>
`;
