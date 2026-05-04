#!/usr/bin/env bash
# Publish packages/r to its own public repo.
#
# First time:
#   1. Create an empty public repo (e.g., github.com/<you>/reason).
#   2. From the monorepo: git remote add r-public git@github.com:<you>/reason.git
#   3. ./packages/r/scripts/subtree.sh publish "Initial release"
#
# Subcommands:
#   publish <msg>  snapshot packages/r as a single commit and force-push to r-public/main
#                  (hides monorepo churn — downstream always sees one clean commit per release)
#   push           git subtree push (preserves per-commit history; use if you want that)
#   pull           git subtree pull — merge public repo changes back into packages/r
#   split [branch] produce a local branch with only packages/r history (debug aid)
#
# Env overrides:
#   R_SUBTREE_REMOTE  (default: r-public)
#   R_SUBTREE_BRANCH  (default: main)
#   R_SUBTREE_PREFIX  (default: packages/r)

set -euo pipefail

REMOTE="${R_SUBTREE_REMOTE:-r-public}"
BRANCH="${R_SUBTREE_BRANCH:-main}"
PREFIX="${R_SUBTREE_PREFIX:-packages/r}"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "error: remote '$REMOTE' not configured." >&2
  echo "       add it first:" >&2
  echo "         git remote add $REMOTE git@github.com:<you>/<repo>.git" >&2
  exit 1
fi

case "${1:-}" in
  publish)
    MSG="${2:-Release}"
    tree_hash=$(git rev-parse "HEAD:$PREFIX")
    commit_hash=$(git commit-tree "$tree_hash" -m "$MSG")
    echo "publishing single-commit snapshot ($commit_hash) → $REMOTE/$BRANCH (force)"
    git push "$REMOTE" "$commit_hash:refs/heads/$BRANCH" --force
    ;;
  push)
    echo "pushing $PREFIX → $REMOTE/$BRANCH (preserves history)"
    git subtree push --prefix="$PREFIX" "$REMOTE" "$BRANCH"
    ;;
  pull)
    echo "pulling $REMOTE/$BRANCH → $PREFIX"
    git subtree pull --prefix="$PREFIX" "$REMOTE" "$BRANCH" --squash
    ;;
  split)
    BRANCH_OUT="${2:-r-split}"
    echo "splitting $PREFIX into branch '$BRANCH_OUT'"
    git subtree split --prefix="$PREFIX" -b "$BRANCH_OUT"
    echo "done. inspect with: git log $BRANCH_OUT"
    ;;
  *)
    cat <<USAGE
usage: $(basename "$0") <publish <msg> | push | pull | split [branch]>

  publish  snapshot $PREFIX as a single commit and force-push to $REMOTE/$BRANCH
  push     git subtree push (preserves per-commit history)
  pull     merge upstream $REMOTE/$BRANCH changes back into $PREFIX
  split    produce a local branch with just $PREFIX's history (default: r-split)
USAGE
    exit 1
    ;;
esac
