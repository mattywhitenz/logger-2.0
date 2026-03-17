# Logger 🐸

```
                   _
                 .'_`--.___   __
                ( 'o`   - .`.'_ )
                 `-._      `_`./_
                   '/\    ( .'/ )
                  ,__//`---'`-'_/
██╗      ██████╗  ██████╗  ██████╗ ███████╗██████╗
██║     ██╔═══██╗██╔════╝ ██╔════╝ ██╔════╝██╔══██╗
██║     ██║   ██║██║  ███╗██║  ███╗█████╗  ██████╔╝
██║     ██║   ██║██║   ██║██║   ██║██╔══╝  ██╔══██╗
███████╗╚██████╔╝╚██████╔╝╚██████╔╝███████╗██║  ██║
╚══════╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝
```

**v2.0** — Log Dynamics CRM engagements from your calendar, requests, and meeting notes. Like Frogger, but for CRM.

---

## Install

**Prerequisites:** Node.js v18+, git, [Claude Code](https://claude.ai/code)

```bash
git clone https://github.com/mattywhitenz/na4v.git ~/logger
cd ~/logger && bash install.sh
```

The install script:
- Builds both MCP servers (`http-client` + `logger-cache`) into `~/mcp-servers/`
- Configures Claude Desktop with both servers
- Installs the Logger skill into Claude Desktop
- Optionally creates a Logger app in `~/Applications` to pin to your Dock

Then quit and reopen Claude Desktop, start a new chat, and type `#start`.

> **Need an API key?** Ask Matty White.

---

## Update

```bash
cd ~/logger && bash upgrade.sh
```

Or just open Claude Code in the `~/logger` folder and type `#upgrade`. It checks GitHub for the latest version, pulls the update, and rebuilds automatically.

---

## Commands

| Command | What it does |
|---------|-------------|
| `#start` | Run startup (first time or new session) |
| `#engagement` | Create a new engagement |
| `#calendar` | Browse Outlook calendar |
| `#requests` | View your SC requests |
| `#note` | Add a timeline note |
| `#next` / `#prev` | Navigate calendar days |
| `#products` | View product list |
| `#refresh` | Reload data |
| `#status` | Cache status |
| `#help` | All commands + version |
| `#upgrade` | Update to latest version |

Every list and menu uses the `(N) #command` pattern — type a number or a command to navigate.

---

## Web UI (Logger 2.0)

Logger 2.0 includes a browser-based UI. To run it:

```bash
cd ~/logger/webapp
npm install && cd client && npm install && cd ..
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

---

## Releasing a new version

See [RELEASING.md](RELEASING.md) for the full release process (5 minutes).

Short version:
1. Bump `VERSION` and `webapp/package.json`
2. `git tag v2.x.x && git push origin main --tags`
3. `gh release create v2.x.x --title "..." --notes "..."`

Users get it automatically on next `#upgrade`.
