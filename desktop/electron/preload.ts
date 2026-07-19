import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IpcChannel,
  type AuthUser,
  type ClocksyBridge,
  type LoginPayload,
  type ProjectOption,
  type TrackerState
} from './types/ipc'

const bridge: ClocksyBridge = {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke(IpcChannel.GetAppVersion),
  login: (payload: LoginPayload) =>
    ipcRenderer.invoke(IpcChannel.Login, payload),
  logout: () => ipcRenderer.invoke(IpcChannel.Logout),
  getUser: () => ipcRenderer.invoke(IpcChannel.GetUser) as Promise<AuthUser | null>,
  getProjects: () =>
    ipcRenderer.invoke(IpcChannel.GetProjects) as Promise<ProjectOption[]>,
  startSession: (projectId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.StartSession, projectId) as Promise<TrackerState>,
  pauseSession: () =>
    ipcRenderer.invoke(IpcChannel.PauseSession) as Promise<TrackerState>,
  resumeSession: () =>
    ipcRenderer.invoke(IpcChannel.ResumeSession) as Promise<TrackerState>,
  stopSession: () =>
    ipcRenderer.invoke(IpcChannel.StopSession) as Promise<TrackerState>,
  getTrackerState: () =>
    ipcRenderer.invoke(IpcChannel.GetTrackerState) as Promise<TrackerState>,
  onSessionStatus: (listener) => {
    const handler = (_event: IpcRendererEvent, state: TrackerState): void => {
      listener(state)
    }
    ipcRenderer.on(IpcChannel.SessionStatus, handler)
    return () => {
      ipcRenderer.removeListener(IpcChannel.SessionStatus, handler)
    }
  }
}

contextBridge.exposeInMainWorld('clocksy', bridge)
