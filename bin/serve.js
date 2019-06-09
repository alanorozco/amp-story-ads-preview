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
import {argv} from '../lib/cli';
import {createServer} from 'http';
import {error, log} from '../lib/log';
import colors from 'colors/safe';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';

const {bgWhite, black, blue} = colors;

const {port = 8001} = argv;

function logRequest({method, url}) {
  log('🏄', bgWhite(` ${black(method)} `), url);
}

const serveDist = serveStatic('dist');

createServer((request, response) => {
  serveDist(request, response, finalhandler(request, response));
})
  .on('error', error)
  .on('request', logRequest)
  .on('listening', () => log(blue(`🌎 Started on http://localhost:${port}/`)))
  .listen(port);
