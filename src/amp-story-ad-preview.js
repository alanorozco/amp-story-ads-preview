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
import {purifyHtml} from '../lib/runtime-deps/purify-html';

const {n} = getNamespace('amp-story-ad-preview');

const textNodesToStr = nodes =>
  Array.from(nodes).map(node =>
    node.nodeType == Node.TEXT_NODE ? node.textContent : node
  );

function Wrap({html}, {childNodes}) {
  return html`
    <div class="${n('wrap')}">
      ${childNodes}
    </div>
  `;
}

export default class AmpStoryAdPreview {
  constructor(context, element) {
    this.context = context;
    this.shadow_ = element.attachShadow({mode: 'open'});
  }

  update(dirty) {
    const {render, win} = this.context;
    const body = purifyHtml(dirty, win.document);

    // `lit-html` seems to bork when trying to render `TextNodes` as first-level
    // elements of a `NodeList` part. This maps them to strings as a workaround.
    // Non-text `Node`s are left as-is.
    const childNodes = textNodesToStr(body.childNodes);

    render(Wrap(this.context, {childNodes}), this.shadow_);
  }
}
