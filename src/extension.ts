import { window, workspace, TextDocument, StatusBarItem, StatusBarAlignment, ExtensionContext, l10n } from 'vscode';
import { statSync } from 'fs';

const BASE = 1024;
const SUFFIXES = [
  'bytes',
  'KB',
  'MB',
  'GB',
  'TB',
];

let statusBarItem: null | StatusBarItem;

function getPrettySize(size: number): string {
  if (size === 1) {
    return '1 byte';
  }
  if (size === 0) {
    return '0 bytes';
  }
  let scale = Math.floor(Math.log(size) / Math.log(BASE));
  let scaledSize = size / Math.pow(BASE, scale);
  let fixedScale = scaledSize.toFixed(2); // round to 2 decimal places
  return `${fixedScale} ${SUFFIXES[scale]}`;
}

function getWordCount(doc: TextDocument): number {
  const text = doc.getText();
  const filterStr = text.replace(/\r\n/g, "\n");
  // cjk words
  const cjk = filterStr.match(/[\u4E00-\u9FA5\uF900-\uFA2D]/g) || [];
  // english words
  const english = filterStr.match(/\b\w+\b/g) || [];
  // numbers
  const letter = filterStr.match(/\b\d+\b/g) || [];
  return (cjk.length + english.length - letter.length) || 0;
}

function dealInfo(document: TextDocument): string {
  let absolutePath = document.fileName;
  let stats;
  try {
    stats = statSync(absolutePath);
  } catch (e) {
    throw Error('Please provide a valid filepath');
  }
  return l10n.t("Size {0}, Lines {1}, Words {2}", getPrettySize(stats.size), getWordCount(document), document.lineCount);
}

function showStatusBarItem(text: string): void {
  if (statusBarItem) {
    statusBarItem.text = text;
    statusBarItem.show();
  }
}

function hideStatusBarItem(): void {
  if (statusBarItem) {
    statusBarItem.text = '';
    statusBarItem.hide();
  }
}

/**
 * Update simple info in the status bar
 */
function updateStatusBarItem(): void {
  // Set up statusBarItem
  if (!statusBarItem) {
    statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, Number.MAX_VALUE);
  }
  try {
    let editor = window.activeTextEditor;
    let doc = editor && editor.document;
    if (doc && (doc.languageId === 'markdown' || doc.languageId === 'plaintext')) {
      showStatusBarItem(dealInfo(doc));
      return;
    }
  } catch (e) {
    console.error('function [updateStatusBarItem] wrong: ', e);
  }
  hideStatusBarItem();
}

/**
 * Called when VS Code activates the extension
 * @param {ExtensionContext} context
 */
function activate(context: ExtensionContext): void {
  // Update handlers
  let onSave = workspace.onDidSaveTextDocument(updateStatusBarItem);
  let onActiveEditorChanged = window.onDidChangeActiveTextEditor(updateStatusBarItem);

  // Register disposables that get disposed when deactivating
  context.subscriptions.push(onSave);
  context.subscriptions.push(onActiveEditorChanged);

  updateStatusBarItem();
}

/**
 * Called when VS Code deactivates the extension
 */
function deactivate(): void {
  if (statusBarItem) {
    statusBarItem.hide();
    statusBarItem.dispose();
  }
  statusBarItem = null;
}

module.exports = {
  activate: activate,
  deactivate: deactivate
};
