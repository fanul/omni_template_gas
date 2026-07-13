/**
 * RPC.gs — Single server-side entry point for all client calls.
 *
 * The Vue app calls google.script.run.dispatch(fn, args) exclusively.
 * dispatch() validates the function name against a whitelist, then routes
 * to the real implementation. All responses are wrapped in { ok, data }.
 *
 * Adding a new server function:
 *  1. Implement it in a relevant .gs file (e.g. Drive.gs)
 *  2. Add its name to WHITELIST below
 *  That's it — no other wiring needed.
 */

/** Whitelisted callable function names */
var WHITELIST = [
  'saveXml',
  'listXml',
  'readXml',
];

/**
 * Route a client RPC call to its server implementation.
 *
 * @param {string} fn   - Function name (must be in WHITELIST)
 * @param {*}      args - Arbitrary JSON-serialisable argument (validated by callee)
 * @returns {{ ok: boolean, data?: *, error?: string }}
 */
function dispatch(fn, args) {
  // 1. Whitelist check — reject unknown functions immediately
  if (WHITELIST.indexOf(fn) === -1) {
    return { ok: false, error: 'Unknown function: ' + fn };
  }

  // 2. Route to implementation
  try {
    var result = globalThis[fn](args);
    return { ok: true, data: result };
  } catch (e) {
    // Log server-side for debugging in Apps Script logs
    console.error('[RPC] ' + fn + ' failed:', e.message);
    return { ok: false, error: e.message };
  }
}
