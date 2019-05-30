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
import {log} from '../lib/log';
import {route} from '../lib/route';
import colors from 'colors/safe';
import compression from 'compression';
import express from 'express';
import uid from 'gen-uid';

const {bgWhite, black, blue, gray, green, red} = colors;

function formatStatusCode(statusCode) {
  if (statusCode >= 200 && statusCode < 300) {
    return green(statusCode);
  }
  if (statusCode < 400) {
    return gray(statusCode);
  }
  return red(statusCode);
}

function logRequest(request, response, next) {
  const requestId = uid.token(/* short */ true);
  const {method, originalUrl} = request;
  log('🏄', `[${requestId}]`, bgWhite(` ${black(method)} `), originalUrl);
  const onFinish = () => {
    const {statusCode, statusMessage} = response;
    log('🏄', `[${requestId}]`, formatStatusCode(statusCode), statusMessage);
    response.removeListener('finish', onFinish);
  };
  response.on('finish', onFinish);
  next();
}

async function serve() {
  const port = process.env.PORT || argv.port || 8001;
  const app = express();

  app.use(logRequest);

  if (argv.compression) {
    app.use(compression());
  }

  return route(app).listen(port, () => {
    log(blue(`🌎 Started on http://localhost:${port}/`));
  });
}

if (isRunningFrom('serve.mjs')) {
  serve();
}
