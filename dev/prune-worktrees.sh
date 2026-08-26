#!/usr/bin/env bash
# Remove every .claude/worktrees/* whose branch is already merged into main,
# then delete that branch. Skips locked worktrees (active jobs) and any with
# uncommitted changes automatically — git refuses without --force, and we don't force.
# Pass -n / --dry-run to just print what would be removed.
# ponytail: uses ancestry (merge-base), so squash-merged branches read as
# "not merged" and are left for manual review — remove those by hand.
set -euo pipefail

dry=0
[ "${1:-}" = "-n" ] || [ "${1:-}" = "--dry-run" ] && dry=1

# Sync: fetch the remote tip and compare against it, not local main (which is
# often behind after PRs merge on GitHub). If we're on the main checkout, also
# fast-forward local main so the working copy is current. From a worktree that's
# impossible (main is checked out elsewhere) — the fetch still makes the prune
# accurate, we just can't advance local main from here.
base=main
if git remote get-url origin >/dev/null 2>&1; then
  git fetch -q origin main && base=origin/main
  if [ "$(git symbolic-ref --short -q HEAD)" = main ]; then
    [ "$dry" = 1 ] || git merge --ff-only origin/main 2>/dev/null \
      && echo "synced: local main -> $(git rev-parse --short origin/main)"
  else
    echo "note: on a worktree — local main not advanced; run from the main checkout to sync it"
  fi
fi

git worktree list --porcelain \
  | awk '/^worktree /{p=$2} /^branch /{sub("refs/heads/","",$2); print p"\t"$2}' \
  | while IFS=$'\t' read -r path branch; do
      case "$path" in */.claude/worktrees/*) ;; *) continue ;; esac
      git merge-base --is-ancestor "$branch" "$base" 2>/dev/null || continue
      if [ "$dry" = 1 ]; then
        echo "would remove: $path ($branch)"
        continue
      fi
      if git worktree remove "$path" 2>/dev/null; then
        git branch -d "$branch" 2>/dev/null || echo "kept branch $branch (not fully merged?)"
        echo "removed: $path ($branch)"
      else
        echo "skipped (locked or dirty): $path ($branch)"
      fi
    done

git worktree prune
