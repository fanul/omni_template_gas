/**
 * rpc.js — Promisified google.script.run wrapper.
 *
 * In Vite dev mode (import.meta.env.DEV === true) the mock layer is used
 * automatically — no GAS connection needed for local UI work.
 *
 * In production (GAS /exec or /dev URL) google.script.run is used.
 *
 * All server calls go through dispatch(fn, args) in RPC.gs.
 */

import { mockRpc } from './rpc.mock.js'

const TIMEOUT_MS = 30_000

/**
 * @param {string} fn    - whitelisted server function name
 * @param {*}      [args] - any JSON-serialisable value
 * @returns {Promise<*>}
 */
export function rpc(fn, args) {
  // ── Local Vite dev → mock ──────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    return mockRpc(fn, args)
  }

  // ── GAS (/exec or /dev URL) → real google.script.run ─────────────────────
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`RPC timeout: "${fn}" (${TIMEOUT_MS}ms)`)),
      TIMEOUT_MS
    )

    // eslint-disable-next-line no-undef
    google.script.run
      .withSuccessHandler((res) => {
        clearTimeout(timer)
        if (res?.ok === false) reject(new Error(res.error || 'Server error'))
        else resolve(res?.data !== undefined ? res.data : res)
      })
      .withFailureHandler((err) => {
        clearTimeout(timer)
        reject(new Error(err?.message || String(err)))
      })
      .dispatch(fn, args)
  })
}
