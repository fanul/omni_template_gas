<script setup>
/**
 * DiagramCanvas.vue — Drag-and-drop diagram editor.
 *
 * Features:
 *  - Add element nodes by clicking type buttons in the toolbar
 *  - Drag nodes freely on the canvas (snapshot saved on mouseup for undo)
 *  - Click a node to select it (shows PropertiesPanel)
 *  - Connect nodes: click ⟶ button to enter connect mode, then click target node
 *  - Click a connection path/label to select it → shows ✕ delete button
 *  - Ctrl+Z / Cmd+Z undo (up to 50 steps)
 *  - SVG connector lines with labels rendered underneath nodes
 *  - No external diagramming library — pure Vue + SVG
 */

import { ref, inject, onMounted, onUnmounted } from 'vue'
import { ELEMENT_TYPES, NODE_SIZE } from '@/config.js'

const elements    = defineModel('elements',    { default: () => [] })
const connections = defineModel('connections', { default: () => [] })
const selected    = defineModel('selected',    { default: null })

const toast = inject('toast', () => {})

// ── Undo history ──────────────────────────────────────────────────────────────
const history = ref([])   // stack of { elements, connections } snapshots
const MAX_HISTORY = 50

/** Save a deep snapshot before any mutating operation. */
function snapshot() {
  history.value.push({
    elements:    JSON.parse(JSON.stringify(elements.value)),
    connections: JSON.parse(JSON.stringify(connections.value)),
  })
  if (history.value.length > MAX_HISTORY) history.value.shift()
}

function undo() {
  if (!history.value.length) return
  const prev = history.value.pop()
  elements.value    = prev.elements
  connections.value = prev.connections
  selected.value    = null
  selectedConn.value = null
  toast('Undo ✓', 'info')
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function onKeyDown(e) {
  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const ctrl  = isMac ? e.metaKey : e.ctrlKey

  // Ctrl/Cmd+Z — undo
  if (ctrl && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
    return
  }

  // Delete / Backspace — delete selected node or connection
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Only fire if focus is NOT in a text input / textarea
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
    if (selectedConn.value !== null) {
      deleteConn(selectedConn.value)
    } else if (selected.value) {
      deleteSelectedNode()
    }
  }
}

onMounted(()  => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

// ── Node creation ─────────────────────────────────────────────────────────────
let uidSeq = 1
function addNode(type) {
  snapshot()
  const id = `el-${Date.now()}-${uidSeq++}`
  elements.value.push({
    id,
    type,
    name:       type,
    context:    '',
    x:          80 + (elements.value.length % 5) * 170,
    y:          80 + Math.floor(elements.value.length / 5) * 120,
    properties: [],
  })
  selected.value     = id
  selectedConn.value = null
}

// ── Delete selected node ──────────────────────────────────────────────────────
function deleteSelectedNode() {
  if (!selected.value) return
  snapshot()
  connections.value = connections.value.filter(
    (c) => c.from !== selected.value && c.to !== selected.value
  )
  elements.value = elements.value.filter((e) => e.id !== selected.value)
  selected.value = null
}

// ── Drag logic ────────────────────────────────────────────────────────────────
const dragging    = ref(null)   // { id, startX, startY, origX, origY }
let   dragMoved   = false       // track if node actually moved (to avoid spurious undo snapshots)

function onNodeMousedown(e, el) {
  if (e.target.tagName === 'BUTTON') return
  e.preventDefault()
  if (connectSource.value && connectSource.value !== el.id) {
    finishConnect(el.id)
    return
  }
  selected.value     = el.id
  selectedConn.value = null
  dragMoved = false
  dragging.value = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',  onMouseUp)
}

function onMouseMove(e) {
  if (!dragging.value) return
  const el = elements.value.find((n) => n.id === dragging.value.id)
  if (!el) return
  const nx = Math.max(0, dragging.value.origX + e.clientX - dragging.value.startX)
  const ny = Math.max(0, dragging.value.origY + e.clientY - dragging.value.startY)
  if (nx !== el.x || ny !== el.y) dragMoved = true
  el.x = nx
  el.y = ny
}

function onMouseUp() {
  // Only save undo snapshot if position actually changed
  if (dragMoved && dragging.value) {
    const el   = elements.value.find((n) => n.id === dragging.value.id)
    const prev = history.value[history.value.length - 1]
    // Snapshot the state BEFORE the drag (using origX/Y stored in dragging ref)
    const preDragEls = JSON.parse(JSON.stringify(elements.value))
    const dragged = preDragEls.find((n) => n.id === dragging.value.id)
    if (dragged) { dragged.x = dragging.value.origX; dragged.y = dragging.value.origY }
    history.value.push({
      elements:    preDragEls,
      connections: JSON.parse(JSON.stringify(connections.value)),
    })
    if (history.value.length > MAX_HISTORY) history.value.shift()
  }
  dragging.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',  onMouseUp)
}

// ── Connect logic ─────────────────────────────────────────────────────────────
const connectSource = ref(null)

function startConnect(id) {
  connectSource.value = id
  selectedConn.value  = null
  toast('Click a target node to connect', 'info')
}

function finishConnect(toId) {
  if (!connectSource.value || connectSource.value === toId) {
    connectSource.value = null
    return
  }
  const exists = connections.value.find(
    (c) => c.from === connectSource.value && c.to === toId
  )
  if (!exists) {
    snapshot()
    connections.value.push({ from: connectSource.value, to: toId, label: '' })
  }
  connectSource.value = null
}

function cancelConnect() { connectSource.value = null }

// ── Connection selection & deletion ──────────────────────────────────────────
const selectedConn = ref(null)   // index into connections.value, or null

function selectConn(idx, e) {
  e.stopPropagation()
  selectedConn.value = idx
  selected.value     = null       // deselect node
}

function deleteConn(idx) {
  snapshot()
  connections.value.splice(idx, 1)
  selectedConn.value = null
}

// ── Canvas click (deselect everything) ────────────────────────────────────────
function onCanvasClick(e) {
  if (e.target === e.currentTarget) {
    selected.value      = null
    selectedConn.value  = null
    connectSource.value = null
  }
}

// ── SVG connector helpers ─────────────────────────────────────────────────────
const W = NODE_SIZE.width
const H = NODE_SIZE.height

function connectorPath(c) {
  const from = elements.value.find((e) => e.id === c.from)
  const to   = elements.value.find((e) => e.id === c.to)
  if (!from || !to) return ''
  const x1 = from.x + W / 2, y1 = from.y + H / 2
  const x2 = to.x   + W / 2, y2 = to.y   + H / 2
  const mx = (x1 + x2) / 2,  my = (y1 + y2) / 2
  return `M ${x1} ${y1} Q ${mx} ${my - 40} ${x2} ${y2}`
}

function connectorMid(c) {
  const from = elements.value.find((e) => e.id === c.from)
  const to   = elements.value.find((e) => e.id === c.to)
  if (!from || !to) return { x: 0, y: 0 }
  return {
    x: (from.x + to.x) / 2 + W / 2,
    y: (from.y + to.y) / 2 + H / 2 - 20,
  }
}

function nodeColor(type) {
  return ELEMENT_TYPES.find((t) => t.value === type)?.color || '#6366f1'
}
</script>

<template>
  <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">
    <!-- Toolbar -->
    <div class="toolbar">
      <span style="font-size:11px;color:var(--text-muted);font-weight:600">ADD:</span>
      <button
        v-for="t in ELEMENT_TYPES" :key="t.value"
        class="btn btn-ghost btn-sm"
        :style="`border-color:${t.color}40;color:${t.color}`"
        @click="addNode(t.value)"
      >{{ t.value }}</button>

      <span class="sep"/>

      <!-- Undo button -->
      <button
        class="btn btn-ghost btn-sm"
        :disabled="!history.length"
        :style="history.length ? '' : 'opacity:.35;cursor:default'"
        @click="undo"
        title="Undo (Ctrl+Z)"
      >↩ Undo</button>

      <span class="sep"/>

      <!-- Connect / delete-connection state -->
      <button
        v-if="connectSource"
        class="btn btn-sm"
        style="background:rgba(16,185,129,.2);color:#10b981;border:1px solid #10b981"
        @click="cancelConnect"
      >✕ Cancel Connect</button>

      <template v-else-if="selectedConn !== null">
        <span style="font-size:11px;color:#f59e0b">Connection selected</span>
        <button
          class="btn btn-danger btn-sm"
          @click="deleteConn(selectedConn)"
        >🗑 Delete Connection</button>
      </template>

      <span v-else style="font-size:11px;color:var(--text-muted)">
        Click ⟶ on a node to connect · click a line to select it · Del to delete · Ctrl+Z undo
      </span>
    </div>

    <!-- Canvas -->
    <div class="canvas-wrap" @click="onCanvasClick">
      <!-- SVG connector layer -->
      <svg class="canvas-svg">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(148,163,184,.7)"/>
          </marker>
          <marker id="arrow-sel" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b"/>
          </marker>
        </defs>

        <g v-for="(c, idx) in connections" :key="`${c.from}-${c.to}-${idx}`">
          <!-- Invisible wide hit-area path for easy clicking -->
          <path
            :d="connectorPath(c)"
            fill="none"
            stroke="transparent"
            stroke-width="16"
            style="cursor:pointer;pointer-events:stroke"
            @click="selectConn(idx, $event)"
          />
          <!-- Visible connector line -->
          <path
            :d="connectorPath(c)"
            fill="none"
            :stroke="selectedConn === idx ? '#f59e0b' : 'rgba(148,163,184,.45)'"
            :stroke-width="selectedConn === idx ? 2.5 : 2"
            :marker-end="selectedConn === idx ? 'url(#arrow-sel)' : 'url(#arrow)'"
            style="pointer-events:none"
          />

          <!-- Delete button shown when connection is selected -->
          <g v-if="selectedConn === idx" style="pointer-events:all">
            <circle
              :cx="connectorMid(c).x"
              :cy="connectorMid(c).y - 18"
              r="10"
              fill="#ef4444"
              style="cursor:pointer"
              @click.stop="deleteConn(idx)"
            />
            <text
              :x="connectorMid(c).x"
              :y="connectorMid(c).y - 14"
              text-anchor="middle"
              font-size="13"
              fill="white"
              style="cursor:pointer;user-select:none;pointer-events:none"
            >✕</text>
          </g>

          <!-- Editable label (always visible) -->
          <foreignObject
            :x="connectorMid(c).x - 50"
            :y="connectorMid(c).y - 10"
            width="100" height="24"
            style="pointer-events:all"
          >
            <input
              xmlns="http://www.w3.org/1999/xhtml"
              type="text"
              :value="c.label"
              @input="c.label = $event.target.value"
              @click.stop="selectConn(idx, $event)"
              placeholder="label"
              :style="`width:100%;background:${selectedConn === idx ? 'rgba(245,158,11,.15)' : 'rgba(30,34,50,.9)'};border:1px solid ${selectedConn === idx ? '#f59e0b' : 'rgba(255,255,255,.15)'};border-radius:4px;color:#94a3b8;font-size:10px;padding:2px 5px;text-align:center`"
            />
          </foreignObject>
        </g>
      </svg>

      <!-- Nodes -->
      <div
        v-for="el in elements" :key="el.id"
        class="node"
        :class="{
          selected: selected === el.id,
          'connecting-source': connectSource === el.id,
        }"
        :style="{
          left: el.x + 'px',
          top:  el.y + 'px',
          width: '140px',
          height: '60px',
          borderColor: nodeColor(el.type),
          background: nodeColor(el.type) + '18',
          color: '#e2e8f0',
        }"
        @mousedown="onNodeMousedown($event, el)"
        @click.stop="() => {
          if (connectSource && connectSource !== el.id) finishConnect(el.id)
          else { selected = el.id; selectedConn = null }
        }"
      >
        <span class="node-type" :style="{color: nodeColor(el.type)}">{{ el.type }}</span>
        <span class="node-name">{{ el.name }}</span>
        <button
          class="btn btn-sm"
          :style="`position:absolute;top:2px;right:2px;padding:1px 5px;font-size:10px;background:${nodeColor(el.type)}30;border:1px solid ${nodeColor(el.type)}60;color:${nodeColor(el.type)}`"
          @click.stop="startConnect(el.id)"
          title="Draw connection from this node"
        >⟶</button>
      </div>
    </div>
  </div>
</template>
