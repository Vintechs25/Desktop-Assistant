import { IPCChannels } from '../shared/types'

declare global {
  interface Window {
    api: {
      [K in keyof IPCChannels]: IPCChannels[K]
    } & {
      /**
       * Subscribe to messages sent from the main process to the renderer.
       * @param channel - The IPC channel to listen on
       * @param callback - Called with the data payload when a message arrives
       * @returns An unsubscribe function that removes the listener
       */
      onMessage: (channel: string, callback: (data: unknown) => void) => () => void
    }
  }
}
