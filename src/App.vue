<script setup>
import { ref, reactive, provide } from 'vue'
import { APP_NAME } from './config.js'
import ConfigForm from './components/ConfigForm.vue'
import DiagramCanvas from './components/DiagramCanvas.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import PromptOutput from './components/PromptOutput.vue'
import { rpc } from './rpc.js'
import { serializeToXml, parseXml } from './xml.js'

// ── Shared state ──────────────────────────────────────────────────────────────
const config = reactive({
  framework:   'vue-vite',
  database:    'single-sheet',
  description: '',
  modules:     [],
  github:      'fanul/omni_template_gas',
})

const elements    = ref([])
const connections = ref([])
const selected    = ref(null)   // selected element id

// Shared undo snapshot function — also called by the canvas internally.
// App-level mutations (panel delete, load) push here so undo covers all actions.
const diagramHistory = ref([])
function snapshotDiagram() {
  diagramHistory.value.push({
    elements:    JSON.parse(JSON.stringify(elements.value)),
    connections: JSON.parse(JSON.stringify(connections.value)),
  })
  if (diagramHistory.value.length > 50) diagramHistory.value.shift()
}

/** Delete selected node + its connections (called from PropertiesPanel delete button) */
function deleteSelectedNode() {
  if (!selected.value) return
  snapshotDiagram()
  connections.value = connections.value.filter(
    (c) => c.from !== selected.value && c.to !== selected.value
  )
  elements.value = elements.value.filter((e) => e.id !== selected.value)
  selected.value = null
}
const toasts      = ref([])
const sideTab     = ref('config') // 'config' | 'prompt'

// ── Toast helper ──────────────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const t = { msg, type, id: Date.now() }
  toasts.value.push(t)
  setTimeout(() => { toasts.value = toasts.value.filter((x) => x.id !== t.id) }, 3000)
}

provide('toast', toast)

// ── XML helpers ───────────────────────────────────────────────────────────────
function getState() {
  return { config, elements: elements.value, connections: connections.value }
}
function loadState({ config: c, elements: els, connections: cons }) {
  Object.assign(config, c)
  elements.value    = els
  connections.value = cons
  selected.value    = null
}

// ── Drive: save ───────────────────────────────────────────────────────────────
const diagramName = ref('my-diagram')
async function saveToDrive() {
  try {
    const content = serializeToXml(getState())
    await rpc('saveXml', { name: diagramName.value, content })
    toast('Saved to Drive ✓')
  } catch (e) { toast(e.message, 'err') }
}

// ── Drive: load dialog ────────────────────────────────────────────────────────
const showDriveList = ref(false)
const driveFiles    = ref([])
async function openDriveList() {
  try {
    driveFiles.value = await rpc('listXml')
    showDriveList.value = true
  } catch (e) { toast(e.message, 'err') }
}
async function loadFromDrive(id) {
  try {
    const { content } = await rpc('readXml', { id })
    loadState(parseXml(content))
    showDriveList.value = false
    toast('Loaded from Drive ✓')
  } catch (e) { toast(e.message, 'err') }
}

// ── Local: download XML ───────────────────────────────────────────────────────
function downloadXml() {
  const blob = new Blob([serializeToXml(getState())], { type: 'application/xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${diagramName.value}.xml`
  a.click()
  URL.revokeObjectURL(a.href)
  toast('Downloaded ✓')
}

// ── Local: load XML from file ─────────────────────────────────────────────────
function handleFileLoad(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      loadState(parseXml(ev.target.result))
      toast('Loaded from file ✓')
    } catch { toast('Invalid XML file', 'err') }
  }
  reader.readAsText(file)
  e.target.value = ''
}
</script>

<template>
  <div class="app-shell">
    <!-- Header -->
    <header class="app-header">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <h1>{{ APP_NAME }}</h1>
      <span class="badge" style="background:rgba(99,102,241,.2);color:#818cf8">GAS + Vue 3</span>
      <span class="spacer"/>

      <!-- Diagram name input -->
      <input type="text" v-model="diagramName" placeholder="diagram name"
             style="width:160px;margin:0" title="Diagram name for save/load"/>

      <!-- Drive actions -->
      <button class="btn btn-ghost btn-sm" @click="openDriveList" title="Load from Drive">
        ☁ Open
      </button>
      <button class="btn btn-primary btn-sm" @click="saveToDrive" title="Save to Drive">
        ☁ Save
      </button>
      <button class="btn btn-ghost btn-sm" @click="downloadXml" title="Download XML">
        ⬇ XML
      </button>
      <label class="btn btn-ghost btn-sm" title="Load local XML file" style="cursor:pointer">
        ⬆ XML
        <input type="file" accept=".xml" style="display:none" @change="handleFileLoad"/>
      </label>
    </header>

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="tabs">
        <button class="tab-btn" :class="{active: sideTab==='config'}" @click="sideTab='config'">⚙ Config</button>
        <button class="tab-btn" :class="{active: sideTab==='prompt'}" @click="sideTab='prompt'">✨ Prompt</button>
      </div>
      <div class="scroll">
        <ConfigForm v-if="sideTab==='config'" :config="config"/>
        <PromptOutput v-else :config="config" :elements="elements" :connections="connections"/>
      </div>
    </aside>

    <!-- Main canvas area -->
    <main class="main-area">
      <DiagramCanvas
        v-model:elements="elements"
        v-model:connections="connections"
        v-model:selected="selected"
      />
      <PropertiesPanel
        v-if="selected"
        :element="elements.find(e => e.id === selected)"
        @update="(patch) => { const el = elements.find(e => e.id === selected); if(el) Object.assign(el, patch) }"
        @delete="deleteSelectedNode"
      />
    </main>

    <!-- Drive file list modal -->
    <Teleport to="body">
      <div v-if="showDriveList" @click.self="showDriveList=false"
           style="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:100">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;width:360px;max-height:80vh;overflow-y:auto">
          <h3 style="margin-bottom:14px;font-size:15px">Load from Drive</h3>
          <p v-if="!driveFiles.length" style="color:var(--text-muted)">No saved diagrams found.</p>
          <div v-for="f in driveFiles" :key="f.id"
               @click="loadFromDrive(f.id)"
               style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;cursor:pointer;transition:background .15s"
               onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background=''">
            <div style="font-weight:600">{{ f.name }}</div>
            <div style="font-size:11px;color:var(--text-muted)">{{ new Date(f.updatedAt).toLocaleString() }}</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" @click="showDriveList=false">Cancel</button>
        </div>
      </div>
    </Teleport>

    <!-- Toasts -->
    <div class="toast-wrap">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.msg }}</div>
    </div>
  </div>
</template>
