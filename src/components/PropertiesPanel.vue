<script setup>
/**
 * PropertiesPanel.vue — Edit selected node's name, type, context description,
 * and custom key-value properties.
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
      <p class="panel-title" style="margin:0;flex:1">Properties — <span style="color:var(--accent-h)">{{ el.type }}: {{ el.name }}</span></p>
      <button class="btn btn-danger btn-sm" @click="emit('delete')">🗑 Delete</button>
    </div>

    <!-- Name -->
    <div class="field" style="margin-bottom:8px">
      <label>Name</label>
      <input type="text" :value="el.name" @input="emit('update', { name: $event.target.value })"/>
    </div>

    <!-- Type -->
    <div class="field" style="margin-bottom:8px">
      <label>Type</label>
      <select :value="el.type" @change="emit('update', { type: $event.target.value })">
        <option v-for="t in ELEMENT_TYPES" :key="t.value" :value="t.value">{{ t.value }}</option>
      </select>
    </div>

    <!-- Context — free-text description used directly in the generated prompt -->
    <div class="field" style="margin-bottom:10px">
      <label>
        Context / Description
        <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted)">
          — written into the prompt
        </span>
      </label>
      <textarea
        :value="el.context || ''"
        @input="emit('update', { context: $event.target.value })"
        placeholder="Describe what this component does, its responsibilities, data it holds, API it calls, etc. This text will appear verbatim in the generated prompt."
        rows="4"
        style="font-size:12px;line-height:1.5"
      />
    </div>

    <!-- Custom key-value properties -->
    <p class="panel-title">Custom Properties <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted)">(key=value pairs)</span></p>
    <div class="prop-row" v-for="(p, i) in (el.properties || [])" :key="i">
      <input type="text" :value="p.key"   placeholder="key"   @input="updateProp(i, 'key',   $event.target.value)"/>
      <input type="text" :value="p.value" placeholder="value" @input="updateProp(i, 'value', $event.target.value)"/>
      <button class="btn btn-ghost btn-sm" @click="removeProp(i)" title="Remove">✕</button>
    </div>
    <button class="btn btn-ghost btn-sm" @click="addProp" style="margin-top:4px">+ Add Property</button>
  </div>
</template>
