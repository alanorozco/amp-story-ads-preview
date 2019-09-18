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

const css = `
.i-amphtml-loader {
  position: absolute;
  display: block;
  height: 10px;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  transform-origin: 50% 50%;
  white-space: nowrap;
}

@keyframes i-amphtml-loader-dots {
  0%, 100% {
    transform: scale(.7);
    background-color: rgba(0, 0, 0, .3);
  }

  50% {
    transform: scale(.8);
    background-color: rgba(0, 0, 0, .5);
  }
}

.i-amphtml-loader-dot {
  position: relative;
  display: inline-block;

  height: 10px;
  width: 10px;
  margin: 2px;
  border-radius: 100%;
  background-color: rgba(0, 0, 0, .3);

  box-shadow: 2px 2px 2px 1px rgba(0, 0, 0, .2);
  will-change: transform;
  animation: i-amphtml-loader-dots 2s infinite;
}
`;

export const html = `<div class="i-amphtml-loader">
  <div class="i-amphtml-loader-dot"></div>
  <div class="i-amphtml-loader-dot"></div>
  <div class="i-amphtml-loader-dot"></div>
</div>`;

export const loaderString = `<style>${css}</style><body>${html}</body>`;
