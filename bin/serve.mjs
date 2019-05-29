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
import {argv, isRunningFrom} from '../lib/cli';
import {build} from './build';
import {route} from '../lib/route';
import colors from 'colors/safe';
import express from 'express';
import log from 'fancy-log';

const {blue} = colors;

export function serve() {
  const port = process.env.PORT || argv.port || 8001;
  const app = express();
  route(app);
  return app.listen(port, () => {
    if (argv.quiet) {
      return;
    }
    log(blue(`Started on http://localhost:${port}/ 🌎`));
  });
}

if (isRunningFrom('serve.mjs')) {
  build().then(serve);
}
