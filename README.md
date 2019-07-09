# ⚡ AMP Story Ads Preview Tool

[![Build Status](https://travis-ci.com/alanorozco/amp-story-ads-preview.svg?token=cqG77daJoMoEWpcKUjSW&branch=master)](https://travis-ci.com/alanorozco/amp-story-ads-preview)

## 🌎 Production Build

👉 [Deployed here](https://amp-story-ads-preview.netlify.com/).

## 🚧 Building

[`yarn`](https://yarnpkg.com) is used for package management.
[Install `yarn`](https://yarnpkg.com/en/docs/install), then install the required
packages via:

```
yarn
```

...then run to build:

```
yarn build
```

### 👷 Developing

To develop locally and watch modified files to build and serve, run:

```sh
yarn watch
```

### 🤹 Other tasks

Tasks on [`pkg.scripts`](./package.json) run with `yarn TASK_NAME`:

- `yarn clean` removes a previous build.
- `yarn lint` lints the project.
- `yarn serve` serves the build.
- `yarn watch-slow` for a slow full-restart watch.
- `yarn x` e\[**x**\]ecutes a `node` binary in the project's context (see `yarn xr`).
- `yarn xr` returns an `-r [DEPENDENCY]` string for runnable dependencies (`ignore-styles` and `esm`).

## 🔁 Continuous Integration

Travis [lints, builds & tests](./.travis.yml)
