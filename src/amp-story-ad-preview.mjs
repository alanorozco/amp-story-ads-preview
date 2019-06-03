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

const {n} = getNamespace('amp-story-ad-preview');

const textNodesToStr = nodes =>
  Array.from(nodes).map(node =>
    node.nodeType == Node.TEXT_NODE ? node.textContent : node
  );

function PreviewInner({html}, {childNodes}) {
  return html`
    <div class="${n('preview')}">
      ${childNodes}
    </div>
  `;
}

export default class AmpStoryAdPreview {
  constructor(context, deps, container) {
    this.shadowContainer = container.attachShadow({mode: 'open'});
    this.context = context;
    this.deps_ = deps;
  }
  update(dirty) {
    const {render} = this.context;
    const previewBody = this.deps_.purifyHtml(dirty);

    const childNodes = textNodesToStr(previewBody.childNodes);

    render(PreviewInner(this.context, {childNodes}), this.shadowContainer);
  }
}
