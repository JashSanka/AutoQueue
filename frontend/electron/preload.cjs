const { contextBridge } = require("electron");

// The renderer deliberately receives no Node.js or generic IPC access.
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
});
