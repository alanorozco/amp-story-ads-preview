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
import {blue, bold, green} from 'colors/safe';
import {exec} from 'child_process';
import {log, step} from '../lib/log';
import {promisify} from 'util';
import glob from 'fast-glob';

const root = 'static/templates';
const execAsync = promisify(exec);

const noFfmpegMsg = `
${bold.red('No ffmpeg found')}
${bold.white('Install:')}
- ${bold.white('macOS:')} ${blue('brew install ffmpeg')}
- ${bold.white('Linux/Debian:')} ${blue('sudo apt install ffmpeg')}`;

function extractFirstFrame(path) {
  const dir = path.replace(/\/[^\/]*$/, '');
  const output = `${dir}/_preview_ff.jpg`;
  log(green(`${path}...`));
  return execAsync(`ffmpeg -i ${path} -vframes 1 -f image2 ${output}`);
}

(async () => {
  try {
    await execAsync('which ffmpeg');
  } catch (_) {
    log(noFfmpegMsg);
    return;
  }
  step('🖼 Extracting first preview frames', async () =>
    Promise.all((await glob(`${root}/**/_preview.mp4`)).map(extractFirstFrame))
  );
})();
