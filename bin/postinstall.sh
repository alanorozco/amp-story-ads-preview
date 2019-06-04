#!/bin/sh

if [ ! -e "vendor/ampproject/amphtml/.git" ]; then
  echo "Updating git submodules..."
  git submodule update --init --recursive
fi
