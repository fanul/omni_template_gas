<script setup>
import { FRAMEWORKS, DATABASES, MODULES } from '@/config.js'

const props = defineProps({ config: Object })
</script>

<template>
  <div>
    <p class="panel-title">App Configuration</p>

    <div class="field">
      <label>Web Framework</label>
      <select v-model="config.framework">
        <option v-for="f in FRAMEWORKS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </div>

    <div class="field">
      <label>Database / Storage</label>
      <select v-model="config.database">
        <option v-for="d in DATABASES" :key="d.value" :value="d.value">{{ d.label }}</option>
      </select>
    </div>

    <div class="field">
      <label>App Description</label>
      <textarea v-model="config.description" placeholder="Describe what the app does…" rows="4"/>
    </div>

    <div class="field">
      <label>Template Modules</label>
      <div class="check-group">
        <label class="check-item" v-for="m in MODULES" :key="m.value">
          <input type="checkbox" :value="m.value" v-model="config.modules"/>
          <span>{{ m.label }}</span>
        </label>
      </div>
    </div>

    <div class="field">
      <label>GitHub Account / Repo</label>
      <input type="text" v-model="config.github" placeholder="username/repo"/>
    </div>
  </div>
</template>
