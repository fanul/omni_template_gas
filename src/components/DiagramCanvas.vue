<script setup>
/**
 * DiagramCanvas.vue — Drag-and-drop diagram editor.
 *
 * Features:
 *  - Add element nodes by clicking type buttons in the toolbar
 *  - Drag nodes freely on the canvas
 *  - Click a node to select it (shows PropertiesPanel)
 *  - Connect nodes: click ⟶ button to enter connect mode, then click target node
 *  - SVG connector lines with labels rendered underneath nodes
 *  - No external diagramming library — pure Vue + SVG
 */

import { ref, inject } from 'vue'
import { ELEMENT_TYPES, NODE_SIZE } from '@/config.js'

const elements    = defineModel('elements',    { default: () => [] })
const connections = defineModel('connections', { default: () => [] })
const selected    = defineModel('selected',    { default: null })

const toast = inject('toast', () => {})

// ── Node creation ─────────────────────────────────────────────────────────────
let uidSeq = 1
function addNode(type) {
  const id = `el-${Date.now()}-${uidSeq++}`
  elements.value.push({
    id,
    type,
    name:       type,
    context:    '',      // free-text description written into the generated prompt
    x:          80 + (elements.value.length % 5) * 170,
    y:          80 + Math.floor(elements.value.length / 5) * 120,
    properties: [],
  })
  selected.value = id
}

// ── Drag logic ────────────────────────────────────────────────────────────────
const dragging = ref(null)  // { id, startX, startY, origX, origY }

function onNodeMousedown(e, el) {
  // Don't start drag on button clicks inside the node
  if (e.target.tagName === 'BUTTON') return
  e.preventDefault()
  // If in connect mode, treat click as connect target
  if (connectSource.value && connectSource.value !== el.id) {
    finishConnect(el.id)
    return
  }
  selected.value  = el.id
  dragging.value  = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',  onMouseUp)
}

function onMouseMove(e) {
  if (!dragging.value) return
  const el = elements.value.find((n) => n.id === dragging.value.id)
  if (!el) return
  el.x = Math.max(0, dragging.value.origX + e.clientX - dragging.value.startX)
  el.y = Math.max(0, dragging.value.origY + e.clientY - dragging.value.startY)
}

function onMouseUp() {
  dragging.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',  onMouseUp)
}

// ── Connect logic ─────────────────────────────────────────────────────────────
const connectSource = ref(null)

function startConnect(id) {
  connectSource.value = id
  toast('Click a target node to connect', 'info')
}

function finishConnect(toId) {
  if (!connectSource.value || connectSource.value === toId) {
    connectSource.value = null
    return
  }
  // Avoid duplicate
  const exists = connections.value.find(
    (c) => c.from === connectSource.value && c.to === toId
  )
  if (!exists) {
    connections.value.push({ from: connectSource.value, to: toId, label: '' })
  }
  connectSource.value = null
}

function cancelConnect() { connectSource.value = null }

// ── Canvas click (deselect / cancel connect) ──────────────────────────────────
function onCanvasClick(e) {
  if (e.target === e.currentTarget) {
    selected.value      = null
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

// ── Get node colour ───────────────────────────────────────────────────────────
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
      <button
        v-if="connectSource"
        class="btn btn-sm"
        style="background:rgba(16,185,129,.2);color:#10b981;border:1px solid #10b981"
        @click="cancelConnect"
      >✕ Cancel Connect</button>
      <span v-else style="font-size:11px;color:var(--text-muted)">
        Click ⟶ on a node to connect
      </span>
    </div>

    <!-- Canvas -->
    <div class="canvas-wrap" @click="onCanvasClick">
      <!-- SVG connector layer (behind nodes) -->
      <svg class="canvas-svg">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(148,163,184,.7)"/>
          </marker>
        </defs>
        <g v-for="c in connections" :key="`${c.from}-${c.to}`">
          <path
            :d="connectorPath(c)"
            fill="none"
            stroke="rgba(148,163,184,.45)"
            stroke-width="2"
            marker-end="url(#arrow)"
          />
          <!-- editable label -->
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
              placeholder="label"
              style="width:100%;background:rgba(30,34,50,.9);border:1px solid rgba(255,255,255,.15);border-radius:4px;color:#94a3b8;font-size:10px;padding:2px 5px;text-align:center"
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
          else selected = el.id
        }"
      >
        <span class="node-type" :style="{color: nodeColor(el.type)}">{{ el.type }}</span>
        <span class="node-name">{{ el.name }}</span>
        <!-- Connect button -->
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
