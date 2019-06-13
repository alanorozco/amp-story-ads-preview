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
import {Deferred} from '../../vendor/ampproject/amphtml/src/utils/promise';

const valueAttrRe = /[a-z_:][-a-z0-9_:.]+=("|')?[^"'\s]+("|')?/gim;
const emptyAttrRe = /\s[a-z_:][-a-z0-9_:.]+(\s|>$)/gim;

/**
 * Parses attributes from an HTML string, and sets them into an element.
 * @param {string} tagWithInnerHtml
 *   Tag containing its inner html but NOT its closing tag.
 *   Like (no closing </div>):
 *   ```
 *   <div class="my-div">
 *     myHtml
 *     <span>
 *       mySpan
 *     </span>
 *   ```
 * @param {Element} element element where the attributes are set
 * @return {string} innerHtml/textContent as parsed
 */
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

/**
 * @param {Document} doc
 * @param {string} tagWithTextContent
 *   Tag containing its inner html but NOT its closing tag.
 *   Like (no closing </script>):
 *   ```
 *   <script src="foo.js">
 *   ```
 *   ...would then return the equivalent result of:
 *   ```
 *   {
 *     const script = doc.createElement('script');
 *     script.setAttribute('src', 'foo.js');
 *     return script;
 *   }
 *   ```
 *   This can take textContent for inline scripts, (again, no closing </script>)
 *   ```
 *   <script type="application/json">
 *     {"myObj": {"foo": "bar"}}
 *   ```
 *   ...would then return the equivalent result of:
 *   ```
 *   {
 *     const script = doc.createElement('script');
 *     script.setAttribute('application/json', '');
 *     script.textContent = '{"myObj": {"foo": "bar"}}';
 *     return script;
 *   }
 *   ```
 * @return {Element} a script element
 */
function scriptElementFromTag(doc, tagWithTextContent) {
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
        const element = scriptElementFromTag(doc, startTagWithTextContent);
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

/**
 * @param {string} html
 * @return {Array<string>}
 *  - First element is the `<head>` and its innerHTML (no closing tag).
 *  - Second element is the `<body>` and its innerHTML (no closing tag).
 * (tip: useful for destructuring) `const [head, body] = splitHeadBody(html)`
 */
function splitHeadBody(html) {
  const [headWithLeadingNoise, bodyWithTrailingNoise] = html.split('</head>');
  const head = headWithLeadingNoise.replace(/^[\s\S]*<head/im, '<head');
  const body = bodyWithTrailingNoise.replace(/<\/body>[\s\S]*$/im, '');
  return [head, body];
}

/**
 * Sets a document's content from a full HTML string.
 *
 * This works as expected with <script> tags, whereas just setting innerHTML
 * would break.
 *
 * This also splits head and body content from the HTML string so that they
 * can be written properly.
 * @param {Document} doc
 * @param {string} html
 */
export function setDocumentHtml(doc, html) {
  const [head, body] = splitHeadBody(html);
  setElementHtml(doc, doc.head, head);
  setElementHtml(doc, doc.body, body);
}

/**
 * Reloads an iframe and updates its contents with an HTML document string
 * afterwards.
 * This is useful to reset an iframe with new contents taken from a string.
 * @param {HTMLIFrameElement} iframe
 * @param {string} html
 * @return {!Promise<Document>}
 *    Resolves with the iframe's document once updated.
 */
export function restartIframeWithDocument(iframe, html) {
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
