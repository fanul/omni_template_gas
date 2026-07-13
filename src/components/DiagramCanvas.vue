<script setup>
/**
 * DiagramCanvas.vue — Full-featured diagram canvas.
 *
 * Features:
 *  - Mouse-wheel zoom toward cursor  |  +/- toolbar buttons  |  fit-to-content
 *  - Drag on empty canvas to pan
 *  - Double-click a node to rename inline (Enter / Esc / blur confirms)
 *  - Context preview shown on node when zoom ≥ 0.65
 *  - Click connection line/label → select (amber) → ✕ to delete
 *  - Ctrl/Cmd+Z undo (50 steps)  |  Del/Backspace to delete selected
 *  - Esc cancels connect mode or closes inline edit
 *  - New nodes placed at viewport centre
 *  - Cursor adapts: grab/grabbing for pan, crosshair for connect, text for editing
 */

import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue'
import { ELEMENT_TYPES, NODE_SIZE } from '@/config.js'

const elements    = defineModel('elements',    { default: () => [] })
const connections = defineModel('connections', { default: () => [] })
const selected    = defineModel('selected',    { default: null })

const toast = inject('toast', () => {})

// ── Viewport ──────────────────────────────────────────────────────────────────
const canvasRef = ref(null)
const zoom   = ref(1)
const panX   = ref(40)
const panY   = ref(40)
const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0

const transformStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
  transformOrigin: '0 0',
  position: 'absolute',
  top: 0, left: 0,
  width: '6000px',
  height: '6000px',
}))

const zoomPct = computed(() => Math.round(zoom.value * 100) + '%')

/** Zoom centred on a viewport point (default: canvas centre) */
function applyZoom(newZoom, vpX, vpY) {
  const rect = canvasRef.value?.getBoundingClientRect() || { width: 800, height: 500 }
  const mx = vpX ?? rect.width  / 2
  const my = vpY ?? rect.height / 2
  newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom))
  // Keep the canvas point under (mx,my) fixed
  panX.value = mx - ((mx - panX.value) / zoom.value) * newZoom
  panY.value = my - ((my - panY.value) / zoom.value) * newZoom
  zoom.value = newZoom
}

function onWheel(e) {
  e.preventDefault()
  const rect = canvasRef.value.getBoundingClientRect()
  const factor = e.deltaY < 0 ? 1.12 : 0.88
  applyZoom(zoom.value * factor, e.clientX - rect.left, e.clientY - rect.top)
}

function zoomIn()  { applyZoom(zoom.value * 1.2) }
function zoomOut() { applyZoom(zoom.value / 1.2) }
function zoomReset() { applyZoom(1) }

function fitToContent() {
  if (!elements.value.length) { zoom.value = 1; panX.value = 40; panY.value = 40; return }
  const rect = canvasRef.value.getBoundingClientRect()
  const pad  = 60
  const xs   = elements.value.map(e => e.x)
  const ys   = elements.value.map(e => e.y)
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const maxX = Math.max(...xs) + NODE_SIZE.width  + pad
  const maxY = Math.max(...ys) + NODE_SIZE.height + pad
  const w = maxX - minX, h = maxY - minY
  const z = Math.min(3, Math.max(MIN_ZOOM, Math.min(rect.width / w, rect.height / h)))
  zoom.value = z
  panX.value = (rect.width  - w * z) / 2 - minX * z
  panY.value = (rect.height - h * z) / 2 - minY * z
}

// ── Pan (drag on empty canvas) ────────────────────────────────────────────────
const isPanning = ref(false)
const panStart  = ref({ x: 0, y: 0, px: 0, py: 0 })

function onCanvasMousedown(e) {
  if (e.target !== canvasRef.value) return   // only canvas background
  if (connectSource.value) { connectSource.value = null; return }
  selected.value     = null
  selectedConn.value = null
  editingId.value    = null
  isPanning.value    = true
  panStart.value     = { x: e.clientX, y: e.clientY, px: panX.value, py: panY.value }
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup',   onPanUp)
}
function onPanMove(e) {
  if (!isPanning.value) return
  panX.value = panStart.value.px + e.clientX - panStart.value.x
  panY.value = panStart.value.py + e.clientY - panStart.value.y
}
function onPanUp() {
  isPanning.value = false
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup',   onPanUp)
}

// ── Canvas cursor ─────────────────────────────────────────────────────────────
const canvasCursor = computed(() => {
  if (isPanning.value)    return 'grabbing'
  if (connectSource.value) return 'crosshair'
  return 'grab'
})

// ── Undo history ──────────────────────────────────────────────────────────────
const history    = ref([])
const MAX_HISTORY = 50

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
  elements.value     = prev.elements
  connections.value  = prev.connections
  selected.value     = null
  selectedConn.value = null
  editingId.value    = null
  toast('Undo ✓', 'info')
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function onKeyDown(e) {
  const ctrl = e.ctrlKey || e.metaKey

  if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
  if (ctrl && e.key === '='){ e.preventDefault(); zoomIn();  return }
  if (ctrl && e.key === '-'){ e.preventDefault(); zoomOut(); return }
  if (ctrl && e.key === '0'){ e.preventDefault(); zoomReset(); return }

  if (e.key === 'Escape') {
    if (editingId.value)    { editingId.value    = null; return }
    if (connectSource.value){ connectSource.value = null; return }
  }

  if (['Delete','Backspace'].includes(e.key)) {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return
    if (selectedConn.value !== null) deleteConn(selectedConn.value)
    else if (selected.value)         deleteSelectedNode()
  }
}

onMounted(()  => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

// ── Inline name editing ───────────────────────────────────────────────────────
const editingId = ref(null)

function startEdit(el, e) {
  e.preventDefault()
  e.stopPropagation()
  if (connectSource.value) return
  selected.value  = el.id
  editingId.value = el.id
  nextTick(() => {
    const input = document.getElementById(`node-edit-${el.id}`)
    if (input) { input.focus(); input.select() }
  })
}

function commitEdit(el, newName) {
  const v = (typeof newName === 'string' ? newName : '').trim()
  if (v) el.name = v
  editingId.value = null
}

// ── Node creation ─────────────────────────────────────────────────────────────
let uidSeq = 1

function addNode(type) {
  snapshot()
  const id   = `el-${Date.now()}-${uidSeq++}`
  const rect = canvasRef.value?.getBoundingClientRect() || { width: 800, height: 500 }
  // Place near current viewport centre with a small jitter so overlapping is avoided
  const jitter = (elements.value.length % 8) * 24
  const cx = (rect.width  / 2 - panX.value) / zoom.value - NODE_SIZE.width  / 2 + jitter
  const cy = (rect.height / 2 - panY.value) / zoom.value - NODE_SIZE.height / 2 + jitter
  elements.value.push({
    id,
    type,
    name:       type,
    context:    '',
    x:          Math.max(0, cx),
    y:          Math.max(0, cy),
    properties: [],
  })
  selected.value     = id
  selectedConn.value = null
}

// ── Delete selected node ──────────────────────────────────────────────────────
function deleteSelectedNode() {
  if (!selected.value) return
  snapshot()
  connections.value = connections.value.filter(c => c.from !== selected.value && c.to !== selected.value)
  elements.value    = elements.value.filter(e => e.id !== selected.value)
  selected.value    = null
}

// ── Node drag ─────────────────────────────────────────────────────────────────
const dragging  = ref(null)
let   dragMoved = false

function onNodeMousedown(e, el) {
  if (e.target.tagName === 'BUTTON') return
  if (e.target.tagName === 'INPUT')  return    // don't drag while editing
  e.preventDefault()
  e.stopPropagation()
  if (connectSource.value && connectSource.value !== el.id) { finishConnect(el.id); return }
  if (editingId.value === el.id) return
  selected.value     = el.id
  selectedConn.value = null
  dragMoved = false
  dragging.value = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup',   onDragUp)
}

function onDragMove(e) {
  if (!dragging.value) return
  const el = elements.value.find(n => n.id === dragging.value.id)
  if (!el) return
  // Convert screen-space delta to canvas-space delta (divide by zoom)
  const nx = Math.max(0, dragging.value.origX + (e.clientX - dragging.value.startX) / zoom.value)
  const ny = Math.max(0, dragging.value.origY + (e.clientY - dragging.value.startY) / zoom.value)
  if (Math.abs(nx - el.x) > 0.5 || Math.abs(ny - el.y) > 0.5) dragMoved = true
  el.x = nx
  el.y = ny
}

function onDragUp() {
  if (dragMoved && dragging.value) {
    // Save pre-drag positions for undo
    const preDrag = JSON.parse(JSON.stringify(elements.value))
    const d = preDrag.find(n => n.id === dragging.value.id)
    if (d) { d.x = dragging.value.origX; d.y = dragging.value.origY }
    history.value.push({ elements: preDrag, connections: JSON.parse(JSON.stringify(connections.value)) })
    if (history.value.length > MAX_HISTORY) history.value.shift()
  }
  dragging.value = null
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup',   onDragUp)
}

// ── Connect ────────────────────────────────────────────────────────────────────
const connectSource = ref(null)

function startConnect(id) {
  connectSource.value = id
  selectedConn.value  = null
  editingId.value     = null
  toast('Click a target node to connect', 'info')
}

function finishConnect(toId) {
  if (!connectSource.value || connectSource.value === toId) { connectSource.value = null; return }
  if (!connections.value.find(c => c.from === connectSource.value && c.to === toId)) {
    snapshot()
    connections.value.push({ from: connectSource.value, to: toId, label: '' })
  }
  connectSource.value = null
}

// ── Connection select/delete ──────────────────────────────────────────────────
const selectedConn = ref(null)

function selectConn(idx, e) {
  e.stopPropagation()
  selectedConn.value = idx
  selected.value     = null
  editingId.value    = null
}

function deleteConn(idx) {
  snapshot()
  connections.value.splice(idx, 1)
  selectedConn.value = null
}

// ── SVG path helpers ──────────────────────────────────────────────────────────
const W = NODE_SIZE.width
const H = NODE_SIZE.height

function connectorPath(c) {
  const f = elements.value.find(e => e.id === c.from)
  const t = elements.value.find(e => e.id === c.to)
  if (!f || !t) return ''
  const x1 = f.x + W / 2, y1 = f.y + H / 2
  const x2 = t.x + W / 2, y2 = t.y + H / 2
  return `M ${x1} ${y1} Q ${(x1+x2)/2} ${(y1+y2)/2 - 50} ${x2} ${y2}`
}

function connectorMid(c) {
  const f = elements.value.find(e => e.id === c.from)
  const t = elements.value.find(e => e.id === c.to)
  if (!f || !t) return { x: 0, y: 0 }
  return { x: (f.x + t.x) / 2 + W / 2, y: (f.y + t.y) / 2 + H / 2 - 25 }
}

function nodeColor(type) {
  return ELEMENT_TYPES.find(t => t.value === type)?.color || '#6366f1'
}
</script>

<template>
  <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">

    <!-- ── Toolbar ──────────────────────────────────────────────────────────── -->
    <div class="toolbar" style="gap:6px">
      <!-- Add node buttons -->
      <span style="font-size:11px;color:var(--text-muted);font-weight:600;flex-shrink:0">ADD:</span>
      <button
        v-for="t in ELEMENT_TYPES" :key="t.value"
        class="btn btn-ghost btn-sm"
        :style="`border-color:${t.color}40;color:${t.color};flex-shrink:0`"
        @click="addNode(t.value)"
      >{{ t.value }}</button>

      <span class="sep"/>

      <!-- Undo -->
      <button
        class="btn btn-ghost btn-sm"
        :style="history.length ? '' : 'opacity:.3;cursor:default'"
        :disabled="!history.length"
        @click="undo"
        title="Undo (Ctrl+Z)"
      >↩</button>

      <span class="sep"/>

      <!-- Zoom controls -->
      <button class="btn btn-ghost btn-sm" @click="zoomOut" title="Zoom out (Ctrl+-)">－</button>
      <span
        style="font-size:12px;font-weight:600;color:var(--text-muted);min-width:42px;text-align:center;cursor:pointer"
        @click="zoomReset"
        title="Reset zoom (Ctrl+0)"
      >{{ zoomPct }}</span>
      <button class="btn btn-ghost btn-sm" @click="zoomIn"  title="Zoom in (Ctrl+=)">＋</button>
      <button class="btn btn-ghost btn-sm" @click="fitToContent" title="Fit diagram to screen">⊡ Fit</button>

      <span class="sep"/>

      <!-- Status hints -->
      <template v-if="connectSource">
        <span style="font-size:11px;color:#10b981;font-weight:500">🔗 Click target node…</span>
        <button class="btn btn-sm" style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid #10b981" @click="connectSource=null">✕ Cancel</button>
      </template>
      <template v-else-if="selectedConn !== null">
        <span style="font-size:11px;color:#f59e0b;font-weight:500">Connection selected</span>
        <button class="btn btn-danger btn-sm" @click="deleteConn(selectedConn)">🗑 Delete</button>
      </template>
      <span v-else style="font-size:11px;color:var(--text-muted)">
        Drag canvas to pan · scroll to zoom · ⟶ to connect · double-click to rename · Del to delete
      </span>
    </div>

    <!-- ── Canvas viewport ──────────────────────────────────────────────────── -->
    <div
      ref="canvasRef"
      class="canvas-wrap"
      :style="{ cursor: canvasCursor }"
      @wheel.prevent="onWheel"
      @mousedown="onCanvasMousedown"
    >
      <!-- Dot-grid background (fixed, doesn't move with pan — pure visual) -->
      <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.35">
        <defs>
          <pattern id="grid-dots" x="0" y="0" :width="20*zoom" :height="20*zoom" patternUnits="userSpaceOnUse"
                   :patternTransform="`translate(${panX % (20*zoom)} ${panY % (20*zoom)})`">
            <circle cx="0.5" cy="0.5" r="0.8" fill="#475569"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)"/>
      </svg>

      <!-- Transform wrapper: pan + zoom applied here -->
      <div :style="transformStyle">

        <!-- SVG connection layer (inside transform, so coords are in canvas space) -->
        <svg style="position:absolute;top:0;left:0;width:6000px;height:6000px;overflow:visible;pointer-events:none">
          <defs>
            <marker id="arr"     markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(148,163,184,.7)"/>
            </marker>
            <marker id="arr-sel" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b"/>
            </marker>
          </defs>

          <g v-for="(c, idx) in connections" :key="`conn-${idx}`">
            <!-- Wide invisible hit area -->
            <path
              :d="connectorPath(c)"
              fill="none" stroke="transparent" stroke-width="14"
              style="cursor:pointer;pointer-events:stroke"
              @click="selectConn(idx, $event)"
            />
            <!-- Visible line -->
            <path
              :d="connectorPath(c)"
              fill="none"
              :stroke="selectedConn === idx ? '#f59e0b' : 'rgba(148,163,184,.5)'"
              :stroke-width="selectedConn === idx ? 2.5 : 1.8"
              :marker-end="selectedConn === idx ? 'url(#arr-sel)' : 'url(#arr)'"
              style="pointer-events:none;transition:stroke .15s"
            />

            <!-- Delete button on selected connection -->
            <g v-if="selectedConn === idx" style="pointer-events:all">
              <circle :cx="connectorMid(c).x" :cy="connectorMid(c).y - 20" r="11"
                      fill="#ef4444" style="cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))"
                      @click.stop="deleteConn(idx)"/>
              <text   :x="connectorMid(c).x"  :y="connectorMid(c).y - 15"
                      text-anchor="middle" font-size="14" fill="white"
                      style="pointer-events:none;user-select:none">✕</text>
            </g>

            <!-- Editable label -->
            <foreignObject
              :x="connectorMid(c).x - 52"
              :y="connectorMid(c).y - 11"
              width="104" height="24"
              style="pointer-events:all;overflow:visible"
            >
              <input
                xmlns="http://www.w3.org/1999/xhtml"
                type="text"
                :value="c.label"
                @input="c.label = $event.target.value"
                @click.stop="selectConn(idx, $event)"
                placeholder="label"
                :style="`width:100%;background:${selectedConn===idx?'rgba(245,158,11,.12)':'rgba(15,17,23,.85)'};border:1px solid ${selectedConn===idx?'#f59e0b':'rgba(255,255,255,.12)'};border-radius:4px;color:#94a3b8;font-size:11px;padding:2px 6px;text-align:center;outline:none;transition:border-color .15s`"
              />
            </foreignObject>
          </g>
        </svg>

        <!-- ── Nodes ──────────────────────────────────────────────────────── -->
        <div
          v-for="el in elements" :key="el.id"
          class="node"
          :class="{
            selected:          selected === el.id && editingId !== el.id,
            'connecting-source': connectSource === el.id,
          }"
          :style="{
            left:        el.x + 'px',
            top:         el.y + 'px',
            width:       '140px',
            minHeight:   '62px',
            borderColor: nodeColor(el.type),
            background:  nodeColor(el.type) + '1a',
            cursor:      editingId === el.id ? 'text' : connectSource ? 'crosshair' : 'move',
          }"
          @mousedown="onNodeMousedown($event, el)"
          @click.stop="() => {
            if (connectSource && connectSource !== el.id) finishConnect(el.id)
            else { selected = el.id; selectedConn = null }
          }"
          @dblclick.stop="startEdit(el, $event)"
        >
          <!-- Type badge -->
          <span class="node-type" :style="{ color: nodeColor(el.type) }">{{ el.type }}</span>

          <!-- Inline name editor vs display -->
          <input
            v-if="editingId === el.id"
            :id="`node-edit-${el.id}`"
            class="node-name-input"
            :value="el.name"
            @blur="e => commitEdit(el, e.target.value)"
            @keydown.enter.stop="e => commitEdit(el, e.target.value)"
            @keydown.escape.stop="editingId = null"
            @click.stop
            @mousedown.stop
          />
          <span v-else class="node-name" :title="el.name">{{ el.name }}</span>

          <!-- Context preview (when zoomed in enough and context exists) -->
          <span
            v-if="el.context && zoom >= 0.65"
            class="node-context"
            :title="el.context"
          >{{ el.context.length > 50 ? el.context.slice(0, 50) + '…' : el.context }}</span>

          <!-- Connect button -->
          <button
            class="node-connect-btn"
            :style="`background:${nodeColor(el.type)}25;border-color:${nodeColor(el.type)}60;color:${nodeColor(el.type)}`"
            @click.stop="startConnect(el.id)"
            title="Draw connection (then click target)"
          >⟶</button>
        </div>

      </div><!-- /transform wrapper -->

      <!-- Corner zoom indicator -->
      <div style="position:absolute;bottom:10px;right:12px;font-size:11px;color:var(--text-muted);background:rgba(15,17,23,.7);padding:3px 8px;border-radius:4px;pointer-events:none">
        {{ zoomPct }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Inline name editor inside node */
.node-name-input {
  width: calc(100% - 8px);
  background: rgba(99,102,241,.15);
  border: 1px solid var(--accent);
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  text-align: center;
  outline: none;
  margin: 2px 4px;
  font-family: inherit;
}

/* Context preview line on node */
.node-context {
  display: block;
  font-size: 9px;
  color: rgba(148,163,184,.7);
  line-height: 1.3;
  margin: 2px 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 126px;
  pointer-events: none;
}

/* Connect button absolutely positioned top-right of node */
.node-connect-btn {
  position: absolute;
  top: 3px;
  right: 3px;
  padding: 1px 5px;
  font-size: 10px;
  border: 1px solid;
  border-radius: 4px;
  cursor: pointer;
  line-height: 1.4;
  opacity: 0;
  transition: opacity .15s;
}
.node:hover .node-connect-btn,
.node.selected .node-connect-btn {
  opacity: 1;
}
</style>
