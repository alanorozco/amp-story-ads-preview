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
import {html} from 'lit-html';
import {redispatchAs} from './utils/events';

const {g, n} = getNamespace('modify-storyAd');

// function cascadeInputClick({currentTarget}) {
//   assert(currentTarget.getElementsByClassName('amp-sap_text-button')).click();
// }

const dispatchModifyStoryAd = redispatchAs(g('modify-storyAd'));

export const ChangeDefaultStory = () => html`
  <div class="${g('text-button')}" @click="${dispatchModifyStoryAd}">
    Modify Story Ad
  </div>
`;
