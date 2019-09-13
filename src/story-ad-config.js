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

export const ampStoryAutoAdsRE = /<amp-story-auto-ads[^]*<\/amp-story-auto-ads>$/m;

export const storyAdsConfig = (src, forceAd) => `
  <amp-story-auto-ads id="i-amphtml-demo-1"${forceAd ? ' development' : ''}>
    <script type="application/json">
      {
        "ad-attributes": {
          "type": "fake",
          "src": "${src}",
          "a4a-conversion": true
        }
      }
    </script>
  </amp-story-auto-ads>`;
