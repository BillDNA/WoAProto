#!/usr/bin/env bash
# Remove every .claude/worktrees/* whose branch is already merged into main,
# then delete that branch. Skips locked worktrees (active jobs) and any with
# uncommitted changes automatically — git refuses without --force, and we don't force.
# Pass -n / --dry-run to just print what would be removed.
set -euo pipefail

dry=0
[ "${1:-}" = "-n" ] || [ "${1:-}" = "--dry-run" ] && dry=1

git worktree list --porcelain \
  | awk '/^worktree /{p=$2} /^branch /{sub("refs/heads/","",$2); print p"\t"$2}' \
  | while IFS=$'\t' read -r path branch; do
      case "$path" in */.claude/worktrees/*) ;; *) continue ;; esac
      git merge-base --is-ancestor "$branch" main 2>/dev/null || continue
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
