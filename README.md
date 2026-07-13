# Prompt Maker — GAS + Vue 3 + Vite

A visual **Prompt Maker** that helps you assemble structured prompts to paste into an AI to generate Google Apps Script web apps.

**GAS Project**: https://script.google.com/home/projects/1EW_RhcbY-1TB_PD341pRE4jhzD8v5RmQ_baa3JhViU1yNJSTTnRV94o9/edit  
**GitHub**: https://github.com/fanul/omni_template_gas

---

## Features

| | |
|---|---|
| ⚙ **Config form** | Pick framework, database, modules, describe the app |
| 🖱 **Drag-and-drop diagram** | Add nodes (Page, Component, DataEntity…), drag freely, connect with arrows, edit labels |
| 💾 **Save/Load XML** | Save to Google Drive or download locally; load from Drive or a local file |
| ✨ **Prompt output** | Live-generated, copy-paste-ready prompt — copy or download as `.txt` |

---

## Project Structure

```
omni_template_gas/
├── .clasp.json              # clasp → GAS project ID + rootDir: ./gas
├── .env / .env.production   # Vite env vars
├── index.html               # Vite entry (dev only)
├── package.json
├── vite.config.js           # vite-plugin-singlefile
├── scripts/
│   └── wrap.js              # post-build: dist/index.html → gas/Index.html
├── src/                     # Vue 3 frontend
│   ├── config.js            # ← ALL option lists live here (extend here!)
│   ├── rpc.js               # promisified google.script.run
│   ├── rpc.mock.js          # mock for local dev (auto-active with `npm run dev`)
│   ├── xml.js               # XML serialize/parse
│   ├── prompt.js            # prompt assembly logic
│   ├── main.js
│   ├── App.vue
│   ├── assets/main.css
│   └── components/
│       ├── ConfigForm.vue
│       ├── DiagramCanvas.vue
│       ├── PropertiesPanel.vue
│       └── PromptOutput.vue
└── gas/                     # Apps Script files (clasp root)
    ├── appsscript.json      # scopes: drive.file, userinfo.email
    ├── Code.gs              # doGet() → serves Index.html
    ├── Drive.gs             # saveXml / listXml / readXml via DriveApp
    ├── RPC.gs               # dispatch() whitelist router
    └── Index.html           # ← overwritten by `npm run wrap` after build
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Enable the Apps Script API

Go to https://script.google.com/home/usersettings and toggle **Google Apps Script API → ON**.

### 3. Login with clasp

```bash
npx clasp login
```

This opens a browser OAuth flow. Complete it once.

---

## Dev Workflow

### Local frontend dev (mock RPC — no GAS needed)

```bash
npm run dev
# → http://localhost:3000
# google.script.run is auto-mocked; Drive calls use fake in-memory data
```

### Full-stack test on GAS `/dev` URL

```bash
npm run deploy:dev
# = npm run build + node scripts/wrap.js + clasp push
```

Then open:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/dev
```

The `/dev` URL runs the **latest saved code** (no caching) and is only accessible to users with editor access. Perfect for testing before publishing.

### Production deploy

```bash
npm run deploy
# = build + wrap + clasp push + clasp deploy (creates a new versioned deployment)
```

The `/exec` URL is the public production URL.

---

## First-time GAS Setup

```bash
# Clone the existing GAS project (reads .clasp.json automatically)
npx clasp clone 1EW_RhcbY-1TB_PD341pRE4jhzD8v5RmQ_baa3JhViU1yNJSTTnRV94o9

# Or just push directly (if project already exists)
npm run deploy:dev
```

After pushing, open the Apps Script editor and **Deploy → New deployment → Web App**:
- Execute as: **Me**
- Who has access: **Anyone** (or your domain)

Copy the `/exec` URL for production, use `/dev` for testing.

---

## GitHub Setup

```bash
git init
git remote add origin https://github.com/fanul/omni_template_gas.git
git add .
git commit -m "chore: initial project setup"
git push -u origin main
```

---

## Extending the App

| To add… | Edit… |
|---|---|
| New framework option | `src/config.js` → `FRAMEWORKS` array |
| New database adapter | `src/config.js` → `DATABASES` + `DB_INSTRUCTIONS` |
| New template module | `src/config.js` → `MODULES` + `MODULE_INSTRUCTIONS` |
| New diagram node type | `src/config.js` → `ELEMENT_TYPES` |
| New server function | `gas/*.gs` + add name to `WHITELIST` in `gas/RPC.gs` + add mock to `src/rpc.mock.js` |

---

## XML Schema

```xml
<promptProject>
  <config>
    <framework>vue-vite</framework>
    <database>single-sheet</database>
    <description>My app description</description>
    <modules>login,role-access</modules>
    <github>username/repo</github>
  </config>
  <diagram>
    <element id="e1" type="Page" name="Home" x="80" y="80">
      <property key="route" value="/"/>
    </element>
    <element id="e2" type="DataEntity" name="Item" x="300" y="200"/>
    <connection from="e1" to="e2" label="loads"/>
  </diagram>
</promptProject>
```
