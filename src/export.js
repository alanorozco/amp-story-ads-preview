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

import './export.css';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {redispatchAs} from './utils/events';

const {g, n} = getNamespace('export');

const dispatchToggleExport = redispatchAs(g('toggle-export'));
const dispatchDownload = redispatchAs(g('download-files'));
const dispatchDismissWarning = redispatchAs(g('dismiss-warning'));

export const ExportButton = () => html`
  <div class=${g('text-button')} @click=${dispatchToggleExport}>
    Export
  </div>
`;

export const VideoDownloadWarning = () => html`
  <div class=${n('warning-container')}>
    <div class=${n('top')}>
      <div class=${n('warning')}>Warning:</div>
      <span class=${n('close')} @click=${dispatchDismissWarning}>ⅹ</span>
    </div>
    It appears you have included video files in your export. The chosen export
    target does not support hosting of video files. It is recommended to host
    these videos externally, and change your html to use absolute urls pointing
    to your hosting domain.
  </div>
`;

const Loader = () => html`
  <div class=${n('title')}>Zipping files... (Please wait)</div>
  <div class=${n('loader-container')}>
    <div class=${n('loader')}>
      <svg id="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
        <g fill="none" fill-rule="evenodd">
          <path
            fill="#FFF"
            d="M0 15c0 8.284 6.716 15 15 15 8.285 0 15-6.716 15-15 0-8.284-6.715-15-15-15C6.716 0 0 6.716 0 15z"
          ></path>
          <path
            fill="#005AF0"
            fill-rule="nonzero"
            d="M13.85 24.098h-1.14l1.128-6.823-3.49.005h-.05a.57.57 0 0 1-.568-.569c0-.135.125-.363.125-.363l6.272-10.46 1.16.005-1.156 6.834 3.508-.004h.056c.314 0 .569.254.569.568 0 .128-.05.24-.121.335L13.85 24.098zM15 0C6.716 0 0 6.716 0 15c0 8.284 6.716 15 15 15 8.285 0 15-6.716 15-15 0-8.284-6.715-15-15-15z"
          ></path>
        </g>
      </svg>
    </div>
  </div>
`;

const ExportMenu = () => html`
  <div class=${n('top')}>
    <div class=${n('title')}>Export Target:</div>
    <span class=${n('close')} @click=${dispatchToggleExport}>ⅹ</span>
  </div>
  <ul>
    <li class=${n('choice')} @click=${dispatchDownload} data-target="local">
      Local
    </li>
    <li class=${n('choice')} @click=${dispatchDownload} data-target="admanager">
      Ad Manager
    </li>
    <li class=${n('choice')} @click=${dispatchDownload} data-target="dv3">
      DV360
    </li>
  </ul>
`;

export const ExportModal = ({isExporting, isDownloading}) => html`
  <div ?hidden=${!isExporting} class=${n('modal')}>
    <div class=${n('content')}>
      ${isDownloading ? Loader() : ExportMenu()}
    </div>
  </div>
`;
