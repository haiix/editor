import CodeMirror from 'codemirror'

import jshint from 'jshint/dist/jshint.js'
import csslint from 'csslint/dist/csslint-node.js'
// import * as jsonlint from 'jsonlint/web/jsonlint.js'

import 'codemirror/lib/codemirror.css'

import 'codemirror/mode/xml/xml.js'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/mode/css/css.js'
import 'codemirror/mode/htmlmixed/htmlmixed.js'

import 'codemirror/addon/edit/matchbrackets.js'
import 'codemirror/addon/edit/closebrackets.js'

import 'codemirror/addon/lint/lint.css'
import 'codemirror/addon/lint/lint.js'
import 'codemirror/addon/lint/javascript-lint.js'
import 'codemirror/addon/lint/css-lint.js'
// import 'codemirror/addon/lint/json-lint.js'

import style from './assets/style.mjs'

window.JSHINT ??= jshint.JSHINT
window.CSSLint ??= csslint.CSSLint
// window.jsonlint = jsonlint

// export default CodeMirror

style(`
  .CodeMirror {
    font-family: Consolas, Inconsolata, Monospace;
    font-size: 14px;
    height: 100%;
    line-height: 18px;
  }
  .CodeMirror-code > :not(:last-child) .CodeMirror-line::after {
    font-family: Monospace;
    position: absolute;
    content: "↓";
    color: #999;
    font-size: 9px;
  }
  .CodeMirror-code > :last-child .CodeMirror-line::after {
    position: absolute;
    content: "[EOF]";
    color: #999;
  }
  .cm-tab::before {
    font-family: Monospace;
    position: absolute;
    content: '>';
    color: #999;
    font-size: 9px;
  }
  .cm-ideographic-space::before {
    font-family: Monospace;
    position: absolute;
    content: '□';
    color: #CCC;
  }
  .CodeMirror-hints {
    font-size: 14px;
  }
`)

// 初期化
export function init (textarea, type) {
  const cm = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    // extraKeys: { 'Ctrl-Space': 'autocomplete' },
    mode: { name: type, globalVars: true },
    gutters: ['CodeMirror-lint-markers'],
    lint: {
      esversion: 12,
      asi: true // セミコロンを無視 (TODO: lintスタイルを設定できるようにしたほうがいいかもしれない)
    }
  })

  // 全角スペースの可視化
  // https://codepen.io/natuan/pen/jzqMZE
  // https://codemirror.net/doc/manual.html#addOverlay
  cm.addOverlay({
    flattenSpans: false,
    token (stream, state) {
      if (stream.match('　')) return 'ideographic-space'
      while (stream.next() != null && !stream.match('　', false));
      return null
    }
  })

  // 改行処理
  cm.on('keydown', (cm, event) => {
    switch (event.keyCode) {
      case 13: // Enter
      {
        if (cm.getSelection() === '') {
          const cursor = cm.getCursor()
          const str = cm.getLine(cursor.line)
          if (str.length - str.trimLeft().length >= cursor.ch) {
            // カーソル位置がコードより左側なら行挿入
            event.preventDefault()
            cm.replaceRange('\n', { line: cursor.line, ch: 0 })
          } else if (str.trimRight().length <= cursor.ch) {
            // カーソル位置がコードより右側ならスペースをトリムする
            cm.replaceRange(str.trimRight(), { line: cursor.line, ch: 0 }, cursor)
          }
        }
        break
      }
    }
  })

  return cm
}
