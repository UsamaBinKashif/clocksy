import 'dotenv/config'
import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { IpcChannel, type LoginPayload } from './types/ipc'
import { authService } from './services/auth'
import { trackerService } from './services/tracker'
import { queueService } from './services/queue'
import { fetchProjects } from './services/catalog'

// Linux: chrome-sandbox often lacks root/SUID in local node_modules installs.
// Required so Electron can start in development without a system-wide sandbox fix.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')

  // Force the X11/XWayland backend. On Wayland, desktopCapturer routes through
  // the xdg-desktop-portal screen-share flow, which prompts on every capture.
  // Under X11 it captures silently (no prompt), and uiohook-napi can also read
  // the X keyboard so activity counts work.
  if (!process.env.ELECTRON_OZONE_PLATFORM_HINT) {
    app.commandLine.appendSwitch('ozone-platform', 'x11')
  }
}

// Touch queue early so the SQLite file is created under userData once app is ready.
function ensureLocalStore(): void {
  queueService.getTodaySeconds()
}

const createWindow = (): void => {
  const window = new BrowserWindow({
    width: 380,
    height: 640,
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.on('ready-to-show', () => window.show())

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const registerIpcHandlers = (): void => {
  ipcMain.handle(IpcChannel.GetAppVersion, () => app.getVersion())

  ipcMain.handle(IpcChannel.Login, async (_event, payload: LoginPayload) => {
    return authService.login(payload.email, payload.password)
  })

  ipcMain.handle(IpcChannel.Logout, async () => {
    await trackerService.forceStopOnLogout()
    await authService.logout()
  })

  ipcMain.handle(IpcChannel.GetUser, () => authService.getUser())

  ipcMain.handle(IpcChannel.GetProjects, () => fetchProjects())

  ipcMain.handle(
    IpcChannel.StartSession,
    (_event, projectId?: string | null) => trackerService.start(projectId)
  )
  ipcMain.handle(IpcChannel.PauseSession, () => trackerService.pause())
  ipcMain.handle(IpcChannel.ResumeSession, () => trackerService.resume())
  ipcMain.handle(IpcChannel.StopSession, () => trackerService.stop())
  ipcMain.handle(IpcChannel.GetTrackerState, () => trackerService.getState())
}

app.whenReady().then(() => {
  ensureLocalStore()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void trackerService.forceStopOnLogout()
})
