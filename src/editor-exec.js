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

// Mirror of lib/bundle.js, with hardcoded component.
// This is needed since with incremental builds, the entry point gets excluded from watching since
// the import is aliased.
// TODO(alanorozco): Revert back generic executable model (it was nice.)
import './global.css';
import {ctor, id} from './editor';
import {IS_DEV} from '../lib/is-dev';
import {liveReload} from './reload-notifications';

new ctor(self, document.getElementById(id));

if (IS_DEV) {
  liveReload(self);
}
