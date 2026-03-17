# Logger Setup Guide

You've just been given Logger — a tool that helps you log Dynamics CRM engagements using Claude. This guide will walk you through setting it up. Just follow along — I'll take it one step at a time.

**INSTRUCTIONS FOR CLAUDE:** When the user drops this file into chat, walk them through each step below ONE AT A TIME. After each step, wait for the user to confirm they've done it before moving to the next. Be friendly, use emojis, and keep it simple. Do NOT dump all steps at once. Start by asking if they're on Mac or Windows, then follow the right instructions for their platform throughout.

---

## Step 1: Mac or Windows?

Ask the user:

> 👋 **Hey! Let's get Logger set up.** This will take about 10 minutes.
>
> **Quick question first** — are you on a **Mac** or **Windows** laptop?

Store their answer and use the right instructions for every step below.

Wait for confirmation before proceeding.

---

## Step 2: Open your terminal

Ask the user:

**Mac:**
> Click the **magnifying glass** (Spotlight) in the top-right of your screen, type **Terminal**, and press Enter.

**Windows:**
> Click the **Start menu**, type **PowerShell**, and click **Windows PowerShell**.

> Got it open? Let me know.

Wait for confirmation before proceeding.

---

## Step 3: Check for Node.js

Ask the user:

> 👍 **Great!** Now I need to check if you have Node.js installed. Type this and press Enter:
>
> ```
> node --version
> ```
>
> What does it say? If you see a version number (like `v20.11.0`), you're good. If it says "command not found" or "not recognized", let me know and I'll help you install it.

If Node.js is NOT installed:

> No worries! Let's install it:
>
> **Option A — Self Service (try this first):**
> Open the **Self Service** app on your laptop.
> - **Mac:** Spotlight → type "Self Service"
> - **Windows:** Start menu → type "Self Service"
>
> Search for **Node.js** or **Node**. If it's there, click Install.
>
> **Option B — Download:**
> Go to **https://nodejs.org** and download the **LTS** version (the big green button).
> - **Mac:** Open the `.pkg` file and follow the installer
> - **Windows:** Open the `.msi` file and follow the installer
>
> You may need to enter your password.
>
> Once installed, **close and reopen your terminal**, then type `node --version` again. Let me know when you see a version number.

Wait for confirmation before proceeding.

---

## Step 4: Install Claude Code

Ask the user:

**Mac:**
> 🔧 **Now let's install Claude Code.** This is the tool that runs Logger.
>
> Type this and press Enter:
>
> ```
> sudo npm install -g @anthropic-ai/claude-code
> ```
>
> It'll ask for your Mac password (the one you use to log in). Type it and press Enter — you won't see any characters appear, that's normal.
>
> It'll download for a minute or so. When it's done, check it worked:
>
> ```
> claude --version
> ```
>
> You should see a version number. Let me know what you see.

**Windows:**
> 🔧 **Now let's install Claude Code.** This is the tool that runs Logger.
>
> First, close PowerShell. Then reopen it by right-clicking **Windows PowerShell** in the Start menu and choosing **Run as Administrator**.
>
> Type this and press Enter:
>
> ```
> npm install -g @anthropic-ai/claude-code
> ```
>
> It'll download for a minute or so. When it's done, check it worked:
>
> ```
> claude --version
> ```
>
> You should see a version number. Let me know what you see.

Wait for confirmation before proceeding.

---

## Step 5: First launch & sign in

Ask the user:

> 🔑 **Now let's launch Claude Code once to sign in and set up permissions.**
>
> Type this:
>
> ```
> claude
> ```
>
> A browser window will open — sign in with your Claude/Anthropic account.
>
> Once you're back in the terminal, Claude will ask about permissions. **Type `y` to allow.**
>
> Once you see the Claude prompt (it'll say something like "How can I help?"), type:
>
> ```
> /exit
> ```
>
> This closes Claude Code. You're now signed in and ready!
>
> **Don't have an account?** Ask Matty White — your team has enterprise seats.

Wait for confirmation before proceeding.

---

## Step 6: Store the folder permanently

Ask the user:

> 📁 **Let's put Logger somewhere permanent on your machine.**
>
> Matty should have shared a folder called `logger` with you. If you haven't already, move it to a permanent location.
>
> I'd recommend your **Documents** folder:

**Mac:**
> Open Finder and drag the `logger` folder into **Documents**.
> The path will be: `~/Documents/logger`

**Windows:**
> Open File Explorer and move the `logger` folder into **Documents**.
> The path will be: `C:\Users\{YourName}\Documents\logger`

> **Important:** Don't leave it in Downloads — that can get cleaned up. Documents is safe.
>
> Let me know once it's in place.

Wait for confirmation before proceeding.

---

## Step 7: Create the Logger app shortcut

Tell the user:

> 🚀 **Now let's make Logger launch like a proper app — one click and you're in.**

**Mac:**
> In Terminal, type this (adjust the path if you put the folder somewhere else):
> ```
> bash ~/Documents/logger/setup-launcher-mac.sh ~/Documents/logger
> ```
>
> This creates a **Logger.app** you can pin to your Dock. To pin it:
> 1. Open **Finder** → press **Cmd+Shift+H** (opens your Home folder)
> 2. Open the **Applications** folder inside your Home folder
> 3. **Drag Logger.app to your Dock**
>
> 🎉 Now you'll always have Logger one click away!

**Windows:**
> In PowerShell, type this (adjust the path if you put the folder somewhere else):
> ```
> powershell -ExecutionPolicy Bypass -File "$HOME\Documents\logger\setup-launcher-windows.ps1" -LoggerDir "$HOME\Documents\logger"
> ```
>
> This creates a **Logger shortcut** on your Desktop. To pin it to your Taskbar:
> 1. **Double-click** the Logger shortcut on your Desktop to test it
> 2. While it's running, **right-click Logger in the Taskbar**
> 3. Click **Pin to taskbar**
>
> 🎉 Now you'll always have Logger one click away!

Wait for confirmation before proceeding.

---

## Step 8: First run

Tell the user:

> 🚀 **Let's launch Logger for the first time!**
>
> **Click the Logger icon** you just pinned (Dock on Mac, Taskbar on Windows).
>
> A terminal window will open and Claude will start up. Once it's ready, type:
> ```
> #project:start
> ```
>
> Let me know what happens!

Wait for confirmation before proceeding.

---

## Step 9: Enter your API key

Tell the user:

> 🔑 **Claude will now ask you for two things:**
>
> **1. Your API key** — this is a unique code Matty White gave you. It looks like a long string of letters and numbers. Paste it in when asked.
>
> **2. Your ServiceNow email** — e.g. `first.last@servicenow.com`
>
> Don't have your API key? Ask **Matty White** — he'll set you up.

Wait for confirmation before proceeding.

---

## Step 10: Set up Power Automate webhooks

Tell the user:

> 🔧 **One more thing — we need to connect your Power Automate flows.** This is a one-time setup so Logger can access your calendar and log to Dynamics.
>
> **1.** Go to **https://make.powerautomate.com** and sign in with your **work account**
>
> **2.** In the left panel, click **My flows**
>
> **3.** Click the **Shared with me** tab

Wait for confirmation, then:

> **4.** Find **"claude- Log Timeline Item to Engagement"**
> — Hover over it, just before where it says "modified"
> — You'll see **3 vertical dots** (⋮) appear — click them
> — Click **Save As**
> — It will ask you to sign in to **Dataverse** — sign in with your work account
> — Click **OK** to create your copy
>
> **5.** Now do the same for **"claude - get OL appt for the day"**
> — Hover → 3 dots → **Save As**
> — Sign in to **Office 365** when asked
> — Click **OK**
>
> Done? Let me know!

Wait for confirmation, then:

> **6.** Now click the **Cloud flows** tab — you should see your two new copies there
>
> **7.** Open **"claude - get OL appt for the day"** (your copy)
> — Click **Turn on** at the top
> — Click **Edit**
> — Click on the **"Get events"** step
> — Click the **Calendar ID** field, then click the **X** to clear it
> — Click the dropdown and select **Calendar**
> — Now click on the **"Manual"** step at the top of the flow
> — Where it says **HTTP URL**, click the **📋 copy icon** (the two overlapping pages)
> — **Paste that URL here** — this is your Outlook webhook

Wait for the user to paste the URL. Store it as the **outlook webhook**.

> **8.** Click **Save** in the web page, then click **Back**, then go back to **Cloud flows**
>
> **9.** Open **"claude- Log Timeline Item to Engagement"** (your copy)
> — Click **Turn on** at the top
> — Click **Edit**
> — Click on the **"Manual"** step
> — Click the **📋 copy icon** next to the HTTP URL
> — **Paste that URL here** — this is your Timeline webhook

Wait for the user to paste the URL. Store it as the **timeline webhook**.

> **10.** Click **Save**, then you can close the Power Automate page.

Once you have both URLs, call `setup_user_webhooks` (see CLAUDE.md action #16) with both webhook URLs and the user's odataid. Then tell the user:

> 🐸 **Webhooks registered!** Your flows are connected — Logger can now read your calendar and log to Dynamics.

Wait for confirmation before proceeding.

---

## Step 11: Verify it works

Tell the user:

> ✅ **You're all set!** Type:
> ```
> #help
> ```
>
> You should see a list of commands like #engagement, #calendar, #note, etc.
>
> If you see that — **welcome to Logger!** 🐸

---

## Step 12: Quick tour

Tell the user:

> 🚀 **Here's what you can do now:**
>
> **📋 #requests** — see your active SC requests from Dynamics
> **📅 #calendar** — browse your Outlook calendar and log engagements from appointments
> **💼 #engagement** — create a new engagement
> **📝 #note** — add a timeline note to any engagement
>
> You can also just **paste meeting notes** and Claude will structure them into SPICED format.

---

## Step 13: Set up Claude Desktop Chat (optional but recommended)

Tell the user:

> 💬 **Want an even smoother experience?** You can also use Logger in Claude Desktop Chat — no terminal, no permission prompts, just a clean chat interface.
>
> You'll need the **Claude Desktop app** (the regular one, not Code):
> - **Self Service** — search for "Claude" or "Claude Desktop" and Install
> - **Or download from** https://claude.com/download
>
> Already have it? Great! In Claude Code, type:
> ```
> #project:setup-desktop
> ```
>
> This will install the MCP servers. Then to install the skill:
> 1. Open the **logger** folder
> 2. Open the **skill** folder
> 3. **Double-click** `logger-engagement.skill`
> 4. Claude Desktop will ask to confirm — click **Install**
> 5. Make sure it's toggled on in **Settings → Customize → Skills**
>
> After that, you can use **either** Claude Code or Desktop Chat — both work with Logger, and they share the same data.

Wait for the user to decide. If they want to set up Desktop, run `#project:setup-desktop` and walk them through it. If not, that's fine — they can do it later.

---

## Troubleshooting

If the user reports issues at any point:

**"npm: command not found" / "npm is not recognized"**
> Node.js isn't installed yet. Go back to Step 3.

**"permission denied" during npm install**
> Mac: Try with `sudo`: `sudo npm install -g @anthropic-ai/claude-code`
> Windows: Reopen PowerShell as Administrator (right-click → Run as Administrator)

**"Unable to connect" when starting Logger**
> Check your API key is correct. Ask Matty White to verify it.

**Logger app icon doesn't launch anything**
> Open your terminal manually and run:
> Mac: `cd ~/Documents/logger && claude --dangerously-skip-permissions`
> Windows: `cd $HOME\Documents\logger; claude --dangerously-skip-permissions`

**"I can't see #calendar or #requests"**
> Those features are enabled per person. Ask Matty White to turn them on for you.

**"Something went wrong"**
> Type `#project:start` to re-run setup, or ask Matty White for help.

---

## Contact

For API keys, feature access, or any issues: **Matty White**
