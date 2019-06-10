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
import './amp-story-ad-preview.css';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {purifyHtml} from '../lib/runtime-deps/purify-html';

const {n} = getNamespace('amp-story-ad-preview');

function Wrap({iframe}) {
  return html`
    <div class="${n('wrap')}">
      ${iframe}
    </div>
  `;
}

export default class AmpStoryAdPreview {
  constructor(win, element) {
    this.win = win;
    this.shadow_ = element.attachShadow({mode: 'open'});
    this.iframe = this.createIframe();
    const iframe = this.iframe;
    render(Wrap({iframe}), this.shadow_);
    this.innerDoc = this.initialize();
  }

  createIframe() {
    const iframe = this.win.document.createElement('iframe');
    iframe.setAttribute('frameBorder', '0');
    iframe.setAttribute('id', 'previewIframe');
    iframe.setAttribute('title', 'Preview Output');
    iframe.setAttribute('allowpaymentrequest', '');
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-forms allow-same-origin allow-popups ' +
        'allow-popups-to-escape-sandbox allow-presentation allow-top-navigation'
    );
    iframe.setAttribute('allowfullscreen', true);
    iframe.classList.add('elevation-4dp');
    return iframe;
  }

  initialize() {
    const head =
      "<head> <meta charset='utf-8'> <script async src='https://cdn.ampproject.org/v0.js'></script> <script async custom-element='amp-story' src='https://cdn.ampproject.org/v0/amp-story-1.0.js'></script> <title>My Story</title> <meta name='viewport' content='width=device-width,minimum-scale=1,initial-scale=1'> <link rel='canonical' href='helloworld.html'></noscript> <style amp-custom> body { font-family: 'Roboto', sans-serif; } amp-story-page { background: white; } h1 { font-size: 2.875em; font-weight: normal; line-height: 1.174; text-transform: uppercase; } </style> </head>";
    const defaultBody =
      "<amp-story standalone> <amp-story-page id='ad'> </amp-story-page> </amp-story>";
    let doc = this.iframe.contentDocument;
    doc.head.innerHTML = head;
    doc.body.innerHTML = defaultBody;

    const innerIframe = this.win.document.createElement('iframe');
    doc.getElementById('ad').append(innerIframe);
    return innerIframe.contentDocument;
  }

  update(dirty) {
    const body = purifyHtml(dirty, this.win.document);

    this.innerDoc.open();
    this.innerDoc.append(body);
    this.innerDoc.close();
  }
}
