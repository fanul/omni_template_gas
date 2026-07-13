/**
 * xml.js — XML serialization and parsing for diagram + config state.
 *
 * Schema:
 *   <promptProject>
 *     <config>
 *       <framework>…</framework>
 *       <database>…</database>
 *       <description>…</description>
 *       <modules>comma,separated</modules>
 *       <github>…</github>
 *     </config>
 *     <diagram>
 *       <element id type name x y>
 *         <property key value/>
 *         …
 *       </element>
 *       <connection from to label/>
 *       …
 *     </diagram>
 *   </promptProject>
 */

// ── Serialize ─────────────────────────────────────────────────────────────────

/**
 * @param {{ config: object, elements: object[], connections: object[] }} state
 * @returns {string} XML string
 */
export function serializeToXml({ config, elements, connections }) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const configXml = `
    <config>
      <framework>${esc(config.framework)}</framework>
      <database>${esc(config.database)}</database>
      <description>${esc(config.description)}</description>
      <modules>${esc((config.modules || []).join(','))}</modules>
      <github>${esc(config.github)}</github>
    </config>`

  const elementsXml = elements.map((el) => {
    const props = (el.properties || [])
      .map((p) => `      <property key="${esc(p.key)}" value="${esc(p.value)}"/>`)
      .join('\n')
    return `    <element id="${esc(el.id)}" type="${esc(el.type)}" name="${esc(el.name)}" x="${el.x}" y="${el.y}">\n${props}\n    </element>`
  }).join('\n')

  const connsXml = connections.map((c) =>
    `    <connection from="${esc(c.from)}" to="${esc(c.to)}" label="${esc(c.label)}"/>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<promptProject>\n${configXml}\n  <diagram>\n${elementsXml}\n${connsXml}\n  </diagram>\n</promptProject>`
}

// ── Parse ─────────────────────────────────────────────────────────────────────

/**
 * @param {string} xmlString
 * @returns {{ config: object, elements: object[], connections: object[] }}
 */
export function parseXml(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const get = (parent, tag) => parent.querySelector(tag)?.textContent?.trim() || ''

  const config = {
    framework:   get(doc, 'framework'),
    database:    get(doc, 'database'),
    description: get(doc, 'description'),
    modules:     get(doc, 'modules').split(',').filter(Boolean),
    github:      get(doc, 'github'),
  }

  const elements = [...doc.querySelectorAll('diagram > element')].map((el) => ({
    id:   el.getAttribute('id'),
    type: el.getAttribute('type'),
    name: el.getAttribute('name'),
    x:    parseFloat(el.getAttribute('x')) || 100,
    y:    parseFloat(el.getAttribute('y')) || 100,
    properties: [...el.querySelectorAll('property')].map((p) => ({
      key:   p.getAttribute('key'),
      value: p.getAttribute('value'),
    })),
  }))

  const connections = [...doc.querySelectorAll('connection')].map((c) => ({
    from:  c.getAttribute('from'),
    to:    c.getAttribute('to'),
    label: c.getAttribute('label') || '',
  }))

  return { config, elements, connections }
}
