/**
 * config.js — Single source of truth for all option lists.
 * Edit here to add frameworks, databases, modules, or element types.
 * This file is client-only; secrets must NEVER be placed here.
 */

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Prompt Maker'

/** Web framework choices shown in the config form */
export const FRAMEWORKS = [
  { value: 'native',       label: 'Native HtmlService' },
  { value: 'vue-cdn',      label: 'Vue.js (CDN)' },
  { value: 'vue-vite',     label: 'Vue.js + Vite' },
  { value: 'react-vite',   label: 'React + Vite' },
  { value: 'svelte-vite',  label: 'Svelte + Vite' },
  { value: 'vanilla-vite', label: 'Vanilla JS + Vite' },
]

/** Database / storage adapter choices */
export const DATABASES = [
  { value: 'script-properties', label: 'Script Properties' },
  { value: 'single-sheet',      label: 'Single Google Sheet' },
  { value: 'multi-sheet',       label: 'Multiple Google Sheets' },
  { value: 'sheet-d1',          label: 'Sheet + Cloudflare D1 (sync)' },
  { value: 'firebase',          label: 'Firebase Realtime DB' },
  { value: 'airtable',          label: 'Airtable' },
]

/** Per-database tailored instructions injected into the generated prompt */
export const DB_INSTRUCTIONS = {
  'script-properties': 'Store all data as JSON strings in PropertiesService (scriptProperties). Use JSON.parse/stringify on every read/write.',
  'single-sheet':      'Use a single Google Sheet with a header row. Implement list/get/create/update/delete helpers using Sheet.getDataRange().',
  'multi-sheet':       'Use one Sheet tab per entity. Name tabs after entities. Implement a generic SheetDAO that accepts a tab name.',
  'sheet-d1':          'Mirror every Sheet write to Cloudflare D1 via the D1 REST API. Store the D1 API token in Script Properties.',
  'firebase':          'Use the Firebase REST API (no SDK). Store the Firebase URL and service-account key in Script Properties.',
  'airtable':          'Use the Airtable REST API. Store the base ID and API token in Script Properties. Map Airtable record IDs to your entity IDs.',
}

/** Template module multi-select options */
export const MODULES = [
  { value: 'login',        label: 'Login / Auth (Google Identity)' },
  { value: 'role-access',  label: 'Role-based Access Control' },
  { value: 'payment-qris', label: 'Payment — QRIS (Indonesian QR standard)' },
  { value: 'crud',         label: 'Generic CRUD UI' },
  { value: 'dashboard',    label: 'Dashboard / Analytics' },
  { value: 'email',        label: 'Email Notifications (MailApp)' },
  { value: 'pdf-export',   label: 'PDF Export (DriveApp)' },
]

/** Module-specific extra instructions injected into the prompt */
export const MODULE_INSTRUCTIONS = {
  'login':        'Session handling via Session.getActiveUser().getEmail(). Never store plaintext passwords.',
  'role-access':  'Roles stored per-user in the datastore. Enforce requireRole() server-side on every sensitive call.',
  'payment-qris': 'Generate a QRIS payload per the Indonesian QRIS standard. Store merchant ID and key in Script Properties. Expose a payment-status webhook handler.',
  'crud':         'Implement a generic list/create/update/delete UI bound to a configurable entity name.',
  'dashboard':    'Aggregate totals and charts from the datastore. Use Chart.js (CDN) for client-side charts.',
  'email':        'Send transactional emails with MailApp.sendEmail(). Template email bodies in a dedicated gs file.',
  'pdf-export':   'Export entity data to PDF using DriveApp.createFile() with a styled HTML template.',
}

/** Node types available on the diagram canvas */
export const ELEMENT_TYPES = [
  { value: 'Page',        color: '#6366f1' },
  { value: 'Component',   color: '#0ea5e9' },
  { value: 'DataEntity',  color: '#10b981' },
  { value: 'Service',     color: '#f59e0b' },
  { value: 'Role',        color: '#ef4444' },
  { value: 'Module',      color: '#8b5cf6' },
  { value: 'ExternalAPI', color: '#64748b' },
]

/** Default canvas node dimensions */
export const NODE_SIZE = { width: 140, height: 60 }
