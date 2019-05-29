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

/**
 * @fileoverview
 * These are universal templates:
 *  - `html` conforms to `Polymer/lit-html`
 *  - other dependencies injected via `context` according to:
 *    https://github.com/popeindustries/lit-html-server#universal-templates
 */

export const Scaffold = ({html}, {body, title = 'AMP Story Ad Preview'}) =>
  html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <script src="/dist/app.js" async></script>
        <link rel="shortcut icon" href="/static/favicon.png" />
      </head>
      <body>
        ${body}
      </body>
    </html>
  `;