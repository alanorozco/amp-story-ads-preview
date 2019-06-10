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
import {html, render} from 'lit-html';
import {purifyHtml} from '../lib/runtime-deps/purify-html';

const {n} = getNamespace('amp-story-ad-preview');

const textNodesToStr = nodes =>
  Array.from(nodes).map(node =>
    node.nodeType == Node.TEXT_NODE ? node.textContent : node
  );

function Wrap({childNodes}) {
  return html`
    <!DOCTYPE html>
    <html amp lang="en">
      <head>
        <meta charset="utf-8" />
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <script
          async
          custom-element="amp-story"
          src="https://cdn.ampproject.org/v0/amp-story-1.0.js"
        ></script>
        <title>My Story</title>
        <meta
          name="viewport"
          content="width=device-width,minimum-scale=1,initial-scale=1"
        />
        <link rel="canonical" href="helloworld.html" />
        <style amp-boilerplate>
          body {
            -webkit-animation: -amp-start 8s steps(1, end) 0s 1 normal both;
            -moz-animation: -amp-start 8s steps(1, end) 0s 1 normal both;
            -ms-animation: -amp-start 8s steps(1, end) 0s 1 normal both;
            animation: -amp-start 8s steps(1, end) 0s 1 normal both;
          }
          @-webkit-keyframes -amp-start {
            from {
              visibility: hidden;
            }
            to {
              visibility: visible;
            }
          }
          @-moz-keyframes -amp-start {
            from {
              visibility: hidden;
            }
            to {
              visibility: visible;
            }
          }
          @-ms-keyframes -amp-start {
            from {
              visibility: hidden;
            }
            to {
              visibility: visible;
            }
          }
          @-o-keyframes -amp-start {
            from {
              visibility: hidden;
            }
            to {
              visibility: visible;
            }
          }
          @keyframes -amp-start {
            from {
              visibility: hidden;
            }
            to {
              visibility: visible;
            }
          }
        </style>
        <noscript
          ><style amp-boilerplate>
            body {
              -webkit-animation: none;
              -moz-animation: none;
              -ms-animation: none;
              animation: none;
            }
          </style></noscript
        >
        <style amp-custom>
          body {
            font-family: 'Roboto', sans-serif;
          }
          amp-story-page {
            background: white;
          }
          h1 {
            font-size: 2.875em;
            font-weight: normal;
            line-height: 1.174;
            text-transform: uppercase;
          }
        </style>
      </head>

      <body>
        <amp-story standalone>
          <amp-story-page id="cover">
            <amp-story-grid-layer template="vertical">
              <h1>Hello World</h1>
              <p>This is the cover page of this story.</p>
            </amp-story-grid-layer>
          </amp-story-page>
        </amp-story>
      </body>
    </html>
  `;
}

function createIframe() {
  const iframe = this.doc.createElement('iframe');
  iframe.setAttribute('frameBorder', '0');
  iframe.setAttribute('id', 'previewIframe');
  iframe.setAttribute('title', 'AMP Playground Output');
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

export default class AmpStoryAdPreview {
  constructor(win, element) {
    this.win = win;
    this.shadow_ = element.attachShadow({mode: 'open'});
  }

  update(dirty) {
    const body = purifyHtml(dirty, this.win.document);

    // `lit-html` seems to bork when trying to render `TextNodes` as first-level
    // elements of a `NodeList` part. This maps them to strings as a workaround.
    // Non-text `Node`s are left as-is.
    const childNodes = textNodesToStr(body.childNodes);

    const iframe = this.createIframe();

    render(Wrap({childNodes}), this.shadow_);
  }
}
