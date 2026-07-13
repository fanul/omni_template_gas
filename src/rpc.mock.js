/**
 * rpc.mock.js — Mock RPC for local Vite dev server.
 * Mirrors every function in RPC.gs / Drive.gs with realistic fake data.
 * Add a handler here whenever you add a new server function.
 */

function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 150))
}

// ── Seed mock Drive files ─────────────────────────────────────────────────────
let _mockFiles = [
  { id: 'mock-1', name: 'my-diagram', updatedAt: new Date(Date.now() - 86400000).toISOString() },
]
let _mockXmlStore = {
  'mock-1': `<promptProject><config><framework>vue-vite</framework><database>single-sheet</database><description>Demo project</description><modules>login,role-access</modules><github>fanul/omni_template_gas</github></config><diagram><element id="e1" type="Page" name="Home" x="80" y="80"><property key="route" value="/"/></element><element id="e2" type="DataEntity" name="Item" x="300" y="200"/><connection from="e1" to="e2" label="loads"/></diagram></promptProject>`,
}

const handlers = {
  async saveXml({ name, content }) {
    await delay()
    // Find existing by name or create new
    const existing = _mockFiles.find((f) => f.name === name)
    if (existing) {
      _mockXmlStore[existing.id] = content
      existing.updatedAt = new Date().toISOString()
      return { id: existing.id }
    }
    const id = `mock-${Date.now()}`
    _mockFiles.push({ id, name, updatedAt: new Date().toISOString() })
    _mockXmlStore[id] = content
    return { id }
  },

  async listXml() {
    await delay(200)
    return [..._mockFiles]
  },

  async readXml({ id }) {
    await delay()
    const content = _mockXmlStore[id]
    if (!content) throw new Error(`File ${id} not found`)
    return { content }
  },
}

export async function mockRpc(fn, args) {
  const h = handlers[fn]
  if (!h) throw new Error(`[mock] Unknown RPC: "${fn}" — add handler to rpc.mock.js`)
  console.debug(`[mock RPC] ▶ ${fn}`, args ?? '')
  const result = await h(args ?? {})
  console.debug(`[mock RPC] ◀ ${fn}`, result)
  return result
}
