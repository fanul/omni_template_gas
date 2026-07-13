# Prompt — Build a "Prompt Maker" app on Google Apps Script (Vue + Vite)

> Paste everything below into your AI. It will build one Google Apps Script Web
> App (frontend in Vue 3 + Vite) that is a visual **prompt maker**: it produces
> prompts you then paste into an AI to generate *other* Google Apps Script apps.

---

You are a senior Google Apps Script and Vue engineer. Build a **Google Apps
Script Web App** whose frontend is **Vue 3 + Vite**. The app is a visual
**Prompt Maker**: it helps a user assemble a structured prompt that they will
paste into an AI to generate *another* Google Apps Script app. Return the
**complete project** — every file under a `// filename` header — plus setup and
deploy steps.

## What the app does
Two features that together produce one final text prompt, shown with **Copy** and
**Download** buttons.

### Feature 1 — Configuration form to prompt
A form. Every option list must live in a single editable config file so it is
trivial to extend:
- **Web framework**: native (HtmlService), Vue.js (CDN), Vue.js + Vite,
  React + Vite, … (extend as needed)
- **Database / storage**: Script Properties, single Google Sheet, multiple
  Google Sheets, single Sheet synced with Cloudflare D1, Firebase, Airtable, …
- **App description**: free text.
- **Template modules** (multi-select): login, role access, payment (QRIS), …
- **GitHub account / repo** for code maintenance.

### Feature 2 — Drag-and-drop diagram to prompt (StarUML-style)
- A canvas where the user adds **element nodes** (e.g. Page, Component, Data
  Entity, Service, Role, Module), **drags them freely**, edits each node's
  name / type / custom key-value properties, and **connects nodes** with labeled
  relationships.
- **Save and load the diagram as XML**, both to **Google Drive** and to a
  **local file**.
- A **Convert to prompt** action that turns the diagram plus the Feature-1
  config into the final prompt.

## How the prompt is assembled
Produce a clean, structured prompt containing: a role line; the app name and
description; the chosen framework and database (with a short tailored instruction
per database, e.g. specifics for QRIS, Cloudflare D1 sync, or Airtable); the
enabled modules; an **Architecture** section listing each diagram element, its
properties, and its outgoing relationships; the GitHub repo; and a
deliverables / constraints section. Keep it copy-paste ready.

## Tech and architecture
- **Frontend**: Vue 3 + Vite, built to a single self-contained HTML file with
  `vite-plugin-singlefile` (Apps Script serves HTML via `HtmlService`). A build
  step copies `dist/index.html` into the clasp project as `Index.html`, served
  by `doGet`.
- **Backend (.gs)**: expose functions for Drive persistence —
  `saveXml(name, content)`, `listXml()`, `readXml(id)` — using `DriveApp` to
  store files in a dedicated app folder. The Vue app calls them through a
  **promisified `google.script.run`** wrapper. Because this runs on Apps Script,
  Drive access needs no separate OAuth client — just the Drive scope in the
  manifest.
- **Local save/load**: download the XML as a Blob and load via a file input, no
  backend needed.
- **clasp** for pushing code and version control, mapped to the GitHub repo.
- **appsscript.json** with the Drive scope and web-app execution config.

## XML format
Define a simple schema: `<promptProject>` with a `<config>` block (framework,
database, description, modules, github) and a `<diagram>` block of
`<element id type name x y>` with nested `<property key value/>` and
`<connection from to label/>`. Serialize and parse it on the client.

## Project structure
Provide a clear tree: the Vite frontend (`src/…` with components for the config
form, the diagram canvas, a node, a properties panel, and the prompt output), the
Apps Script backend (`server/*.gs`), the build/wrap script, `.clasp.json`,
`appsscript.json`, and a `README.md`.

## Deliverables
- Complete, copy-paste-ready code for every file.
- Exact commands: install, dev, build, and `clasp push` to deploy; plus enabling
  the Apps Script API, `clasp login`, deploying as a Web App, and linking the
  GitHub repo.
- It must run end to end: add elements, drag and connect them, edit config,
  generate a prompt, and save/load XML to both Drive and local file.

## Constraints
- Vue 3 `<script setup>`, clean componentization, and **no heavy diagramming
  library** — implement dragging and connectors directly.
- Keep all option lists (frameworks, databases, modules, element types) in one
  config file so they are easy to add to.
- Validate server inputs; read any secrets from Script Properties; comment
  non-obvious logic.
- Responsive down to mobile, with visible keyboard focus.
