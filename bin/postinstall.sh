#!/bin/sh

STALE_AMPHTML="amphtml"
CURRENT_AMPHTML="vendor/ampproject/amphtml"
CURRENT_AMPHTML_REL="../../"

STALE_AMPHTML_GIT=".git/modules/$STALE_AMPHTML"
CURRENT_AMPHTML_GIT=".git/modules/$CURRENT_AMPHTML"

KEPT_PWD=`pwd`

rename_dir () {
  mkdir -p $2
  cp -R $1"/." $2 && rm -Rf $1
  cd ..
  cd $KEPT_PWD
}

replace_in_file () {
  cat $2 | sed -i -e "$1" $2
}

if [ -e "$STALE_AMPHTML_GIT/config" ]; then
  echo "Renaming .git/.../amphtml/config worktree..."

  STALE_GIT_REL="../../../"
  STALE_WORKTREE="$STALE_GIT_REL/$STALE_AMPHTML"
  CURRENT_WORKTREE="$CURRENT_AMPHTML_REL/$STALE_GIT_REL/$CURRENT_HTML"

  replace_in_file \
  \ "s~worktree = $STALE_WORKTREE~worktree = $CURRENT_WORKTREE~g" \
  \ "$STALE_AMPHTML_GIT/config"

  echo "Moving .git/.../amphtml..."
  rename_dir $STALE_AMPHTML_GIT $CURRENT_AMPHTML_GIT
fi

if [ -e "$CURRENT_AMPHTML_GIT/config" ]; then
  echo "Renaming .git/.../amphtml/config worktree..."

  STALE_GIT_REL="../../../"
  STALE_WORKTREE="$STALE_GIT_REL/$STALE_AMPHTML"
  CURRENT_WORKTREE="$CURRENT_AMPHTML_REL/$STALE_GIT_REL/$CURRENT_HTML"

  replace_in_file \
  \ "s~worktree = $STALE_WORKTREE~worktree = $CURRENT_WORKTREE~g" \
  \ "$CURRENT_AMPHTML_GIT/config"

  if ! grep -q $CURRENT_AMPHTML "$CURRENT_AMPHTML_GIT/config"; then
fi

if [ -e "$STALE_AMPHTML/.git" ]; then
  echo "Moving amphtml..."
  rename_dir $STALE_AMPHTML $CURRENT_AMPHTML
fi

if [ -e "$CURRENT_AMPHTML/.git" ]; then
  echo "Renaming vendor/.../amphtml/.git gitdir..."
  STALE_REL="../"
  STALE_GITDIR="$STALE_REL/$STALE_AMPHTML_GIT"
  CURRENT_GITDIR="$CURRENT_AMPHTML_REL/$STALE_REL/$CURRENT_AMPHTML_GIT"

  replace_in_file \
  \ "s~gitdir: $STALE_GIT_DIR~gitdir: $CURRENT_GIT_DIR~g" \
  \ "$CURRENT_AMPHTML/.git"
else
  echo "Updating git submodules..."
  git submodule update --init --recursive
fi
