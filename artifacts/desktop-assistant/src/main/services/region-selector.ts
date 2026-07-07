import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { ScreenRegion } from '../../shared/types'

let regionSelectorWindow: BrowserWindow | null = null

/**
 * Creates a transparent fullscreen window for region selection.
 * Returns the selected region coordinates via IPC.
 */
export function createRegionSelectorWindow(): Promise<ScreenRegion> {
  return new Promise((resolve, reject) => {
    const { width, height } = screen.getPrimaryDisplay().bounds

    regionSelectorWindow = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      fullscreen: true,
      transparent: true,
      alwaysOnTop: true,
      frame: false,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: true,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        sandbox: false
      }
    })

    regionSelectorWindow.setAlwaysOnTop(true, 'screen-saver')

    const html = buildRegionSelectorHTML(width, height)
    regionSelectorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    regionSelectorWindow.once('ready-to-show', () => {
      regionSelectorWindow!.show()
      regionSelectorWindow!.focus()
    })

    const onRegionSelected = (_event: Electron.IpcMainEvent, region: ScreenRegion): void => {
      cleanup()
      resolve(region)
    }

    const onRegionCancelled = (): void => {
      cleanup()
      reject(new Error('Region selection cancelled'))
    }

    ipcMain.once('region-selector:selected', onRegionSelected)
    ipcMain.once('region-selector:cancelled', onRegionCancelled)

    regionSelectorWindow.on('closed', () => {
      ipcMain.removeListener('region-selector:selected', onRegionSelected)
      ipcMain.removeListener('region-selector:cancelled', onRegionCancelled)
      regionSelectorWindow = null
      reject(new Error('Region selector window closed'))
    })

    function cleanup(): void {
      ipcMain.removeListener('region-selector:selected', onRegionSelected)
      ipcMain.removeListener('region-selector:cancelled', onRegionCancelled)
      if (regionSelectorWindow && !regionSelectorWindow.isDestroyed()) {
        regionSelectorWindow.close()
      }
      regionSelectorWindow = null
    }
  })
}

function buildRegionSelectorHTML(screenWidth: number, screenHeight: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${screenWidth}px;
      height: ${screenHeight}px;
      overflow: hidden;
      background: transparent;
      cursor: crosshair;
      user-select: none;
    }
    canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    #hint {
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 6px 14px;
      border-radius: 6px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      pointer-events: none;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="hint">Click and drag to select a region &mdash; Press Esc to cancel</div>
  <script>
    const { ipcRenderer } = require('electron');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = ${screenWidth};
    canvas.height = ${screenHeight};

    let startX = 0, startY = 0, endX = 0, endY = 0;
    let isDragging = false;

    function drawOverlay() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Dark translucent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!isDragging) return;

      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);

      // Clear selection area
      ctx.clearRect(x, y, w, h);

      // Selection border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Dimension label
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, y - 22, 90, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(w + ' x ' + h, x + 6, y - 7);
    }

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      endX = e.clientX;
      endY = e.clientY;
      drawOverlay();
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      endX = e.clientX;
      endY = e.clientY;
      drawOverlay();
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      endX = e.clientX;
      endY = e.clientY;

      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      if (width < 5 || height < 5) {
        // Too small — cancel
        ipcRenderer.send('region-selector:cancelled');
        return;
      }

      ipcRenderer.send('region-selector:selected', { x, y, width, height });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ipcRenderer.send('region-selector:cancelled');
      }
    });

    // Initial overlay draw
    drawOverlay();
  </script>
</body>
</html>`
}
