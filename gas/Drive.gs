/**
 * Drive.gs — Drive persistence for diagram XML files.
 *
 * All files are stored in a dedicated app folder in the user's Drive.
 * Requires scope: https://www.googleapis.com/auth/drive
 *
 * RPC convention: every function receives a SINGLE args object from dispatch().
 * Destructure what you need from that object.
 *
 * Exposed via RPC.gs dispatch whitelist:
 *   saveXml({ name, content }) → { id }
 *   listXml()                  → [{ id, name, updatedAt }]
 *   readXml({ id })            → { content }
 */

var FOLDER_NAME = 'PromptMaker Diagrams';

/**
 * Returns (or creates) the dedicated app folder in the user's Drive.
 * @returns {DriveApp.Folder}
 */
function getAppFolder_() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
}

/**
 * Save or overwrite a named XML diagram.
 * @param {{ name: string, content: string }} args
 * @returns {{ id: string }}
 */
function saveXml(args) {
  // args is the single object passed by dispatch()
  var name    = args && args.name;
  var content = args && args.content;

  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('name is required');
  }
  if (typeof content !== 'string') {
    throw new Error('content must be a string');
  }

  var folder = getAppFolder_();
  var files  = folder.getFilesByName(name + '.xml');

  if (files.hasNext()) {
    var file = files.next();
    file.setContent(content);
    return { id: file.getId() };
  } else {
    var newFile = folder.createFile(name + '.xml', content, MimeType.PLAIN_TEXT);
    return { id: newFile.getId() };
  }
}

/**
 * List all XML diagrams saved in the app folder.
 * @returns {Array<{ id: string, name: string, updatedAt: string }>}
 */
function listXml() {
  var folder = getAppFolder_();
  var files  = folder.getFiles();
  var result = [];
  while (files.hasNext()) {
    var f = files.next();
    result.push({
      id:        f.getId(),
      name:      f.getName().replace(/\.xml$/, ''),
      updatedAt: f.getLastUpdated().toISOString(),
    });
  }
  result.sort(function(a, b) { return b.updatedAt.localeCompare(a.updatedAt); });
  return result;
}

/**
 * Read the XML content of a diagram by its Drive file ID.
 * @param {{ id: string }} args
 * @returns {{ content: string }}
 */
function readXml(args) {
  var id = args && args.id;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('id is required');
  }
  try {
    var file = DriveApp.getFileById(id);
    return { content: file.getBlob().getDataAsString() };
  } catch (e) {
    throw new Error('File not found or access denied: ' + id);
  }
}
