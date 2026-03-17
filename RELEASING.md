# Releasing Logger

How to ship a new version. The whole process takes about 5 minutes.

---

## Versioning

Logger uses [semver](https://semver.org):

| Change | Version bump | Example |
|--------|-------------|---------|
| Bug fix, small UI tweak | PATCH | `2.0.0` → `2.0.1` |
| New feature, new command | MINOR | `2.0.1` → `2.1.0` |
| Breaking change, major redesign | MAJOR | `2.1.0` → `3.0.0` |

---

## Release checklist

### 1. Bump the version

Edit `VERSION` (the single source of truth):
```
2.1.0
```

Also bump `webapp/package.json` to match:
```json
"version": "2.1.0"
```

### 2. Commit

```bash
git add VERSION webapp/package.json
git commit -m "chore: bump version to v2.1.0"
```

### 3. Tag

```bash
git tag v2.1.0
git push origin main --tags
```

### 4. Create a GitHub Release

```bash
gh release create v2.1.0 \
  --title "v2.1.0 — What changed in one line" \
  --notes "## What's new

- Feature X: description
- Fix Y: description

## Upgrade

Open Claude Code in your logger folder and run \`#upgrade\`."
```

Or use the GitHub web UI: **Releases → Draft a new release → Choose tag → Write notes → Publish**.

That's it. Users who run `#upgrade` will automatically get the new version on next upgrade.

---

## What users see on upgrade

The `upgrade.sh` script checks this endpoint:
```
https://api.github.com/repos/mattywhitenz/na4v/releases/latest
```

It reads `tag_name` and compares with the local `VERSION` file. If there's a newer version, it pulls and rebuilds. If they're already up to date, it tells them.

---

## Hotfix (patch release)

Same as above but branch from main, fix, merge back, bump PATCH.

```bash
git checkout -b hotfix/calendar-crash
# fix it
git checkout main
git merge hotfix/calendar-crash
git tag v2.0.1
git push origin main --tags
gh release create v2.0.1 --title "v2.0.1 — Fix calendar crash" --notes "- Fixed calendar crashing when end time is null"
```

---

## Repo structure for releases

```
logger/
├── VERSION              ← single source of truth for version
├── install.sh           ← fresh install for new users
├── upgrade.sh           ← update script (git pull + rebuild)
├── CLAUDE.md            ← Claude skill instructions
├── data/
│   └── products.json    ← bundled product list (update when products change)
├── mcp-servers/         ← MCP server source (rebuilt on install/upgrade)
└── webapp/              ← Web UI (separate from core skill)
```

---

## Sharing with new users

Send them:
```
git clone https://github.com/mattywhitenz/na4v.git ~/logger
cd ~/logger && bash install.sh
```

Or share the repo link and point them to `SETUP.md`.

For users without git, zip the repo (excluding `node_modules` and `dist`):
```bash
git archive --format=zip --output=logger-v2.1.0.zip HEAD
```
Then they extract and run `bash install.sh`.
