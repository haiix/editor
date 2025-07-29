/**
 * @type {import("typescript")}
 */
let typescript;
export async function init() {
  typescript = await import(/* webpackPreload: true */ 'typescript');
}

export const options = {
  module: 99, // monaco.languages.typescript.ModuleKind.ESNext
  target: 99, // monaco.languages.typescript.ScriptTarget.ESNext
  jsx: 2, // monaco.languages.typescript.JsxEmit.React
  strict: true,
  noUncheckedIndexedAccess: true, // 配列のインデックスアクセスを厳密にチェックする
  // inlineSourceMap: true,
  // sourceMap: true
  allowJs: true,
  checkJs: true,
  allowImportingTsExtensions: true,
  experimentalDecorators: true,
};

/**
 * トランスパイル
 * @param {string} path
 * @param {string} code
 * @returns {Blob | null}
 */
export function transpile(path, code) {
  if (!path.endsWith('.ts') && !path.endsWith('.tsx')) return null;
  const result = typescript.transpile(code, options);
  return new Blob([result], { type: 'text/javascript' });
}
