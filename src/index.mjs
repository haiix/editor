import App from './App.mjs';
import { init as editorInit } from './editor/editor-base.mjs';
import initApp from './assets/initApp.mjs';
import { init as typeScriptInit } from './typescript-base.mjs';

(async () => {
  await Promise.all([typeScriptInit(), editorInit()]);
  initApp(App);
})();
