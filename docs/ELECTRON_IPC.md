# Electron IPC and security

There are **zero IPC channels** in the current Electron implementation. `main.cjs` registers no `ipcMain` handlers/listeners and `preload.cjs` imports no `ipcRenderer`.

## Renderer-exposed API

|API|Direction|Arguments / return|Security|
|---|---|---|---|
|`window.electronAPI.platform`|Preload → renderer|Read-only platform string|Non-privileged metadata only|

No renderer-accessible functions invoke the main process.

## Main-process-only functions

|Function / capability|Why private|Indirect access|
|---|---|---|
|`createWindow()`|Creates privileged native BrowserWindow|None|
|Application lifecycle handlers|Start, activate and quit management|None|
|`BrowserWindow` and filesystem module resolution|Native capabilities remain in main process|None|

## Security audit

- `contextIsolation` is enabled.
- `nodeIntegration` is disabled and the renderer is sandboxed.
- No generic `ipcRenderer`, Node APIs, filesystem APIs, or secrets are exposed.
- No IPC input validation is necessary because no IPC channel exists.
- Future privileged operations must use narrow, validated `ipcMain.handle` channels and a matching allowlisted preload wrapper.
