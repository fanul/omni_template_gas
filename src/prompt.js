/**
 * prompt.js — Assembles the final structured prompt from config + diagram.
 * All text generation lives here; UI components just call buildPrompt().
 */

import {
  FRAMEWORKS, DATABASES, MODULES,
  DB_INSTRUCTIONS, MODULE_INSTRUCTIONS,
} from './config.js'

/**
 * @param {{ config: object, elements: object[], connections: object[] }} state
 * @returns {string} Ready-to-paste prompt
 */
export function buildPrompt({ config, elements, connections }) {
  const frameworkLabel = FRAMEWORKS.find((f) => f.value === config.framework)?.label || config.framework
  const databaseLabel  = DATABASES.find((d)  => d.value === config.database)?.database || config.database
  const dbInstruction  = DB_INSTRUCTIONS[config.database] || ''

  const enabledModules = (config.modules || [])
    .map((m) => {
      const mod = MODULES.find((x) => x.value === m)
      const instr = MODULE_INSTRUCTIONS[m] || ''
      return `  - **${mod?.label || m}**: ${instr}`
    })
    .join('\n')

  // Architecture section from diagram
  const archSection = elements.map((el) => {
    const outgoing = connections.filter((c) => c.from === el.id)

    // Context: free-text description the user typed on the node
    const contextBlock = el.context?.trim()
      ? `  > ${el.context.trim().replace(/\n/g, '\n  > ')}`
      : null

    // Key-value custom properties
    const props = (el.properties || [])
      .filter((p) => p.key)
      .map((p) => `  - **${p.key}**: ${p.value}`)
      .join('\n')

    // Outgoing connections
    const rels = outgoing.map((c) => {
      const target = elements.find((e) => e.id === c.to)
      return `  → **${target?.name || c.to}** _(${c.label || 'relates to'})_`
    }).join('\n')

    return [
      `### ${el.type}: ${el.name}`,
      contextBlock,
      props  || null,
      rels   || null,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `# AI Prompt — Build a Google Apps Script Web App

## Role
You are a senior Google Apps Script and ${frameworkLabel} engineer.

## App Overview
- **Name**: ${config.description ? config.description.split('\n')[0] : 'My App'}
- **Description**: ${config.description || '(no description provided)'}
- **GitHub repo**: ${config.github || '(not specified)'}

## Stack
- **Frontend framework**: ${frameworkLabel}
- **Data / storage adapter**: ${databaseLabel || config.database}
  > ${dbInstruction}

## Enabled Modules
${enabledModules || '  (none selected)'}

## Architecture
${archSection || '  (no diagram elements added)'}

## Deliverables
1. Complete, copy-paste-ready code for every file.
2. Clear project structure tree.
3. Setup and deploy instructions: install → build → \`clasp push\` → deploy as Web App.
4. An end-to-end demo so the app runs immediately after setup.

## Constraints
- Treat all client input as untrusted; validate server-side.
- Store secrets (API keys, tokens) in Script Properties — never hard-code them.
- Keep functions small and testable; comment non-obvious logic.
- Respond with every file under a \`// filename\` header, copy-paste ready.
`.trim()
}
