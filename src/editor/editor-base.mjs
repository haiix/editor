// @ts-check
import { options } from '../typescript-base.mjs';

/**
 * @type {import("monaco-editor/esm/vs/editor/editor.api")}
 */
let monaco;
export async function init() {
  monaco = await import(
    /* webpackPreload: true */ 'monaco-editor/esm/vs/editor/editor.api.js'
  );
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(options);
}

/**
 * モデル生成
 * @param {string} path
 * @param {string} content
 * @param {(event: import("monaco-editor").editor.IModelContentChangedEvent) => void} onChange
 * @returns {import("monaco-editor").editor.ITextModel}
 */
export function createModel(path, content, onChange) {
  const model = monaco.editor.createModel(
    content,
    '', // language (無指定でもpathの拡張子から自動で判別される)
    monaco.Uri.parse(path),
  );
  model.updateOptions({ tabSize: 2 });
  model.onDidChangeContent(onChange);
  return model;
}

/**
 * エディタ生成
 * @param {HTMLElement} container
 * @param {import("monaco-editor").editor.ITextModel} model
 * @returns {import("monaco-editor").editor.IStandaloneCodeEditor}
 */
export function createEditor(container, model) {
  const element = document.createElement('div');
  container.append(element);

  const editor = monaco.editor.create(element, {
    model,
    minimap: { enabled: false },
  });
  return editor;
}

/**
 * エディター破棄
 * @param {import("monaco-editor").editor.IStandaloneCodeEditor} editor
 */
export function disposeEditor(editor) {
  editor.getContainerDomNode().remove();
  editor.dispose();
}

/**
 * モデル破棄
 * @param {import("monaco-editor").editor.ITextModel} model
 */
export function disposeModel(model) {
  model.dispose();
}

/**
 * エディターの状態を更新する
 * @param {import("monaco-editor").editor.ITextModel} model
 */
export function refresh(model) {
  // undo/redoを消さずにimportを更新
  // 現状エディターの先頭に1文字追加して削除することで解決しているが、正しいやり方を調べる
  for (let n = 1; n <= 2; n++) {
    model.applyEdits([
      {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: n,
        },
        text: n === 1 ? ' ' : '',
      },
    ]);
  }
}
