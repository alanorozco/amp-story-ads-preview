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

const portAttr = 'data-reload-port';

export function reloadNotifications(element, notify) {
  if (!('WebSocket' in window)) {
    return;
  }

  if (!element.hasAttribute(portAttr)) {
    return;
  }

  const port = element.getAttribute(portAttr);
  const socket = new WebSocket(`ws://localhost:${port}`);

  socket.addEventListener('message', ({data}) => {
    try {
      const {built} = JSON.parse(data);
      if (built) {
        notify();
      }
    } catch (_) {}
  });

  return socket;
}

export function liveReload(win) {
  const declElement = win.document.querySelector(`[${portAttr}]`);
  if (!declElement) {
    return;
  }
  reloadNotifications(declElement, () => win.location.reload());
}
