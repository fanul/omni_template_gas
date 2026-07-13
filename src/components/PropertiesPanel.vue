<script setup>
/**
 * PropertiesPanel.vue — Edit selected node's name, type, and custom key-value properties.
 */
import { computed } from 'vue'
import { ELEMENT_TYPES } from '@/config.js'

const props  = defineProps({ element: Object })
const emit   = defineEmits(['update', 'delete'])

const el = computed(() => props.element)

function addProp() {
  emit('update', { properties: [...(el.value.properties || []), { key: '', value: '' }] })
}
function removeProp(idx) {
  const ps = [...(el.value.properties || [])]
  ps.splice(idx, 1)
  emit('update', { properties: ps })
}
function updateProp(idx, field, val) {
  const ps = [...(el.value.properties || [])]
  ps[idx] = { ...ps[idx], [field]: val }
  emit('update', { properties: ps })
}
</script>

<template>
  <div class="props-panel" v-if="el">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <p class="panel-title" style="margin:0;flex:1">Properties</p>
      <button class="btn btn-danger btn-sm" @click="emit('delete')">🗑 Delete</button>
    </div>

    <div class="field" style="margin-bottom:8px">
      <label>Name</label>
      <input type="text" :value="el.name" @input="emit('update', { name: $event.target.value })"/>
    </div>

    <div class="field" style="margin-bottom:10px">
      <label>Type</label>
      <select :value="el.type" @change="emit('update', { type: $event.target.value })">
        <option v-for="t in ELEMENT_TYPES" :key="t.value" :value="t.value">{{ t.value }}</option>
      </select>
    </div>

    <p class="panel-title">Custom Properties</p>
    <div class="prop-row" v-for="(p, i) in (el.properties || [])" :key="i">
      <input type="text" :value="p.key"   placeholder="key"   @input="updateProp(i, 'key',   $event.target.value)"/>
      <input type="text" :value="p.value" placeholder="value" @input="updateProp(i, 'value', $event.target.value)"/>
      <button class="btn btn-ghost btn-sm" @click="removeProp(i)">✕</button>
    </div>
    <button class="btn btn-ghost btn-sm" @click="addProp" style="margin-top:4px">+ Add Property</button>
  </div>
</template>
