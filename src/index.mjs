import jshint from 'jshint/dist/jshint.js'
import csslint from 'csslint/dist/csslint-node.js'
// import * as jsonlint from 'jsonlint/web/jsonlint.js'

import 'codemirror/lib/codemirror.css'

import 'codemirror/mode/xml/xml.js'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/mode/css/css.js'
import 'codemirror/mode/htmlmixed/htmlmixed.js'

// import 'codemirror/addon/edit/matchbrackets.js'
// import 'codemirror/addon/edit/closebrackets.js'

import 'codemirror/addon/lint/lint.css'
import 'codemirror/addon/lint/lint.js'
import 'codemirror/addon/lint/javascript-lint.js'
import 'codemirror/addon/lint/css-lint.js'
// import 'codemirror/addon/lint/json-lint.js'

import initApp from './assets/initApp.mjs'
import App from './App.mjs'

window.JSHINT = window.JSHINT || jshint.JSHINT
window.CSSLint = window.CSSLint || csslint.CSSLint
// window.jsonlint = jsonlint

initApp(App)
