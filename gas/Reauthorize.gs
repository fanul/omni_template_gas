/**
 * Reauthorize.gs — Run this function ONCE from the Apps Script editor
 * to trigger the OAuth consent screen for all required scopes.
 *
 * Steps:
 *  1. Open the Apps Script editor
 *  2. Select "reauthorizeAll" from the function dropdown
 *  3. Click ▶ Run
 *  4. A popup will ask you to review permissions → click "Review Permissions"
 *  5. Choose your Google account and click "Allow"
 *  6. Done — you can delete this file afterwards if you like.
 */
function reauthorizeAll() {
  // ── Drive scope ───────────────────────────────────────────────────────────
  // Touches DriveApp to force authorization of https://www.googleapis.com/auth/drive
  var folder = DriveApp.getRootFolder();
  Logger.log('✅ Drive OK — root folder: ' + folder.getName());

  // ── Script storage scope ──────────────────────────────────────────────────
  var props = PropertiesService.getScriptProperties();
  props.setProperty('_auth_check', 'ok');
  props.deleteProperty('_auth_check');
  Logger.log('✅ Script Properties OK');

  // ── User identity scope ───────────────────────────────────────────────────
  var email = Session.getActiveUser().getEmail();
  Logger.log('✅ User identity OK — logged in as: ' + email);

  Logger.log('');
  Logger.log('🎉 All scopes authorized successfully!');
  Logger.log('You can now use the web app at /exec or /dev.');
}
