<script setup>
import { computed, ref } from 'vue'
import { buildPrompt } from '@/prompt.js'

const props = defineProps({
  config:      Object,
  elements:    Array,
  connections: Array,
})

const prompt = computed(() => buildPrompt({
  config:      props.config,
  elements:    props.elements,
  connections: props.connections,
}))

const copied = ref(false)
function copyPrompt() {
  navigator.clipboard.writeText(prompt.value).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function downloadPrompt() {
  const blob = new Blob([prompt.value], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'prompt.txt'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div>
    <p class="panel-title">Generated Prompt</p>
    <div class="btn-group" style="margin-bottom:12px">
      <button class="btn btn-primary btn-sm" @click="copyPrompt">
        {{ copied ? '✓ Copied!' : '⎘ Copy' }}
      </button>
      <button class="btn btn-ghost btn-sm" @click="downloadPrompt">⬇ Download</button>
    </div>
    <div class="prompt-box">{{ prompt }}</div>
    <p style="font-size:11px;color:var(--text-muted);margin-top:8px">
      Paste this into any AI (ChatGPT, Gemini, Claude…) to generate a complete GAS app.
    </p>
  </div>
</template>
