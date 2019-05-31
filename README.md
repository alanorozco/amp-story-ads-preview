# ⚡ AMP Story Ads Preview Tool

## Building

Make sure to initialize `git` submodules:

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

Other tasks defined in `scripts` on [`package.json`](./package.json) can be run as `yarn TASK_NAME`.
