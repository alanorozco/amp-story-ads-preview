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
import {minifyInlineJs} from './utils/minify-inline-js';

export const cssPatch = ` <style amp-custom>
.i-amphtml-glass-pane {
  height: 100% !important;
  width: 100% !important;
  z-index: 1 !important;
}

.ad {
  border: none;
  width: 100% !important;
  height: 100% !important;
}

/* TODO: Include amp-story-auto-ads.css built from runtime */
amp-story-cta-layer {
  display: block !important;
  position: absolute !important;
  top: 80% !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  margin: 0 !important;
  z-index: 3 !important;
}

.i-amphtml-story-ad-link {
  background-color: #ffffff !important;
  border-radius: 20px !important;
  bottom: 32px !important;
  box-shadow: 0px 2px 12px rgba(0, 0, 0, 0.16) !important;
  color: #4285f4 !important;
  font-family: 'Roboto', sans-serif !important;
  font-weight: bold !important;
  height: 36px !important;
  left: 50% !important;
  letter-spacing: 0.2px !important;
  line-height: 36px;
  margin-left: -60px !important;
  position: absolute !important;
  text-align: center;
  text-decoration: none !important;
  width: 120px !important;
}

[ad-showing] .i-amphtml-story-ad-link {
  animation-delay: 100ms !important;
  animation-duration: 300ms !important;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
  animation-fill-mode: forwards !important;
  animation-name: ad-cta !important;
}

@keyframes ad-cta {
  from {
    opacity: 0;
    font-size: 0px;
    transform: scale(0);
  }

  to {
    opacity: 1;
    font-size: 13px;
    transform: scale(1);
  }
}

.i-amphtml-ad-overlay-container {
  height: 24px !important;
  left: 0 !important;
  padding: 14px 0 0 !important;
  pointer-events: none !important;
  position: absolute !important;
  top: 0 !important;
  z-index: 100001 !important;
}

[dir='rtl'] .i-amphtml-ad-overlay-container {
  left: auto !important;
  right: 0 !important;
}

[desktop]:not([supports-landscape]) .i-amphtml-ad-overlay-container {
  /* On desktop a story page has a with of 45vh. */
  left: calc(50vw - 22.5vh) !important;
  /* And a height of 75 vh. */
  top: 12.5vh !important;
}

[dir='rtl'] [desktop] .i-amphtml-ad-overlay-container {
  left: auto !important;
  /* On desktop a story page has a with of 45vh. */
  right: calc(50vw - 22.5vh) !important;
}

.i-amphtml-story-ad-attribution {
  color: #ffffff !important;
  font-size: 18px !important;
  font-family: 'Roboto', sans-serif !important;
  font-weight: bold !important;
  letter-spacing: 0.5px !important;
  margin: 0 0 0 16px !important;
  opacity: 0 !important;
  padding: 0 !important;
  visibility: hidden !important;
}

[dir='rtl'] .i-amphtml-story-ad-attribution {
  margin-left: 0px !important;
  margin-right: 16px !important;
}

[ad-showing][desktop]:not([supports-landscape])
  .i-amphtml-story-ad-attribution {
  /* Have to wait for page to slide in. */
  transition: opacity 0.1s linear 0.3s;
}

[ad-showing] .i-amphtml-story-ad-attribution {
  visibility: visible !important;
  opacity: 1 !important;
}

.i-amphtml-story-ad-cover {
  text-align: center;
  color: white;
}
</style>
`;

export const navigationPatch = minifyInlineJs(`
if (window.history && window.history.replaceState) {
  window.history.replaceState(
    {
      ampStoryPageId: '$pageId$',
    },
    ''
  );
}
`);
