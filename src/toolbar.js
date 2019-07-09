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
import './toolbar.css';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';

const {n, g} = getNamespace('toolbar');

export const Toolbar = ({classNames = [], children}) => html`
  <div class="${[g('flex-center'), n('toolbar'), ...classNames].join(' ')}">
    ${children}
  </div>
`;
