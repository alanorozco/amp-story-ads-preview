# ⚡ AMP Story Ads Preview Tool

[![Build Status](https://travis-ci.com/alanorozco/amp-story-ads-preview.svg?token=cqG77daJoMoEWpcKUjSW&branch=master)](https://travis-ci.com/alanorozco/amp-story-ads-preview)

## Production Build

👉 [Deployed here](https://amp-story-ads-preview.herokuapp.com/).

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Building

Make sure to initialize `git` submodules (you only need to do this once):

```
git submodule update --init --recursive
```

[`yarn`](https://yarnpkg.com) is used for package management.
[Install `yarn`](https://yarnpkg.com/en/docs/install), then run to build:

```
yarn build
```

### Developing

To develop locally and watch modified files to build and serve, run:

```sh
yarn watch
```

### Other tasks

Other tasks defined in `scripts` on [`package.json`](./package.json) can be run as `yarn TASK_NAME`:

- `yarn clean` removes a previous build.
- `yarn lint` lints the project.
- `yarn serve` serves the build.

## Continuous Integration

Travis [lints, builds & tests](./.travis.yml)
