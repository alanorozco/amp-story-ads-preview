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
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {untilAttached} from './utils/until-attached';

const {n} = getNamespace('amp-story-ad-preview');

const defaultIframeSandbox = [
  'allow-scripts',
  'allow-forms',
  'allow-same-origin',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-top-navigation',
].join(' ');

function Wrap() {
  return html`
    <div class="${n('wrap')}">
      <iframe
        frameborder="0"
        allowpaymentrequest
        allowfullscreen
        id=${n('iframe')}
        class=${'elevation-4dp' /* still not sure why lol */}
        sandbox=${defaultIframeSandbox}
        title="AMP Story Ad Preview"
        src="/static/empty.html"
      >
      </iframe>
    </div>
  `;
}

const valueAttrRe = /[a-z_:][-a-z0-9_:.]+=("|')?[^"'\s]+("|')?/gim;
const emptyAttrRe = /\s[a-z_:][-a-z0-9_:.]+(\s|>$)/gim;

function parseSetAttributes(tagWithInnerHtml, element) {
  const startTagEnd = Math.max(0, tagWithInnerHtml.indexOf('>'));
  const startTag = tagWithInnerHtml.substring(0, startTagEnd);
  const innerHtml = tagWithInnerHtml
    .substring(startTag.length)
    .replace(/^>/, '');

  // set empty attrs, like `async`
  for (const nameWithNoise of startTag.match(emptyAttrRe) || []) {
    const name = nameWithNoise.trim().replace(/>$/, '');
    element.setAttribute(name, '');
  }

  // set value attrs, like `src="..."`
  for (const attr of startTag.match(valueAttrRe) || []) {
    const [name, valueWithQuotes] = attr.split('=');
    const value = valueWithQuotes.replace(/(^['"]|['"]$)/g, '');
    element.setAttribute(name, value);
  }

  return innerHtml;
}

function scriptElementFromStartTag(doc, tagWithTextContent) {
  const script = doc.createElement('script');
  script.textContent = parseSetAttributes(tagWithTextContent, script);
  return script;
}

/**
 * Sets `innerHTML` with `<script>` tags working by appending them as individual
 * elements.
 * @param {Document} doc
 * @param {Element} element
 * @param {string} startTagWithInnerHtml
 */
function setElementHtml(doc, element, startTagWithInnerHtml) {
  let scriptsFragment;
  const htmlWithScripts = parseSetAttributes(startTagWithInnerHtml, element);

  element.innerHTML = htmlWithScripts.replace(
    /<script[^>]+src[^>]+>[\s\S]*<\/script>/gim,
    scriptTags => {
      for (const startTagWithTextContent of scriptTags.split('</script>')) {
        const element = scriptElementFromStartTag(doc, startTagWithTextContent);
        scriptsFragment = scriptsFragment || doc.createDocumentFragment();
        scriptsFragment.appendChild(element);
      }
      return ''; // Clear script tags.
    }
  );

  if (scriptsFragment) {
    element.appendChild(scriptsFragment);
  }
}

function splitHeadBody(html) {
  const [headWithLeadingNoise, bodyWithTrailingNoise] = html.split('</head>');
  const head = headWithLeadingNoise.replace(/^[\s\S]*<head/im, '<head');
  const body = bodyWithTrailingNoise.replace(/\/body>[\s\S]*$/im, '');
  return [head, body];
}

function setDocumentHtml(doc, html) {
  const [head, body] = splitHeadBody(html);
  setElementHtml(doc, doc.head, head);
  setElementHtml(doc, doc.body, body);
}

function restartIframeWithDocument(iframe, html) {
  const {promise, resolve} = new Deferred();
  const setContent = () => {
    setDocumentHtml(iframe.contentDocument, html);
    resolve(iframe.contentDocument);
    iframe.removeEventListener('load', setContent);
  };
  iframe.addEventListener('load', setContent);
  iframe.contentWindow.location.reload();
  return promise;
}

export default class AmpStoryAdPreview {
  constructor(win, element) {
    this.win = win;
    this.element = element;

    this.iframePromise_ = untilAttached(this.element, 'iframe');

    render(Wrap(), this.element);
  }

  async update(dirty) {
    restartIframeWithDocument(await this.iframePromise_, dirty);
  }
}
