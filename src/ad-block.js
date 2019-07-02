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
import './ad-block.css';
import {assert} from '../lib/assert';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import once from 'lodash.once';

const {n} = getNamespace('ad-block');

const likelyBlocked = 'https://cdn.ampproject.org/amp4ads-v0.js';

export const isAdBlocked = once(async win => {
  if (!win) {
    return false;
  }
  try {
    const response = await win.fetch(likelyBlocked);
    assert(response.status == 200);
    return false;
  } catch (_) {
    return true;
  }
});

function lastPathPart(url) {
  const split = url.split('/');
  return split.pop();
}

export async function AdBlockWarning(win) {
  if (!(await isAdBlocked(win))) {
    return '';
  }
  return html`
    <div class=${n('warning')}>
      <a href=${likelyBlocked} target="_blank"
        ><code>${lastPathPart(likelyBlocked)}</code></a
      >
      appears to be blocked. If you're running an ad blocker, you should disable
      it.
    </div>
  `;
}
