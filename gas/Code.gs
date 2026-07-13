/**
 * Code.gs — Entry point for the Apps Script Web App.
 *
 * doGet() is called by both the /exec (production) and /dev (latest-code) URLs.
 * It always serves Index.html, which contains the fully self-contained Vue app.
 *
 * The /dev URL is accessible only to users who have edit access to the script;
 * it always runs the latest saved code with no caching — ideal for testing
 * before deploying a new version to /exec.
 */
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Prompt Maker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
