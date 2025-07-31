import { deviceService } from './service'

class ContextMenuService {
  private heatmapEnabled = false

  async init(): Promise<void> {
    try {
      const state = deviceService.getState()
      this.heatmapEnabled = state.showHeatmap

      await this.createMenus()
      this.setupEventHandlers()
    } catch (error) {
      console.error('Error initializing context menus:', error)
    }
  }

  private async createMenus(): Promise<void> {
    await chrome.contextMenus.removeAll()

    chrome.contextMenus.create({
      id: 'toggle-heatmap',
      title: `${this.heatmapEnabled ? 'Disable' : 'Enable'} Heatmap`,
      contexts: ['action'],
    })

    chrome.contextMenus.create({
      id: 'float-video',
      title: 'Float Video',
      contexts: ['action'],
    })
  }

  private setupEventHandlers(): void {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        switch (info.menuItemId) {
          case 'toggle-heatmap':
            await this.toggleHeatmap()
            break
          case 'float-video':
            if (tab?.id) {
              await this.floatVideo(tab.id)
            }
            break
        }
      } catch (error) {
        console.error('Error handling context menu click:', error)
      }
    })
  }

  private async toggleHeatmap(): Promise<void> {
    this.heatmapEnabled = !this.heatmapEnabled

    await deviceService.setSettings({
      showHeatmap: this.heatmapEnabled,
    })

    chrome.contextMenus.update('toggle-heatmap', {
      title: `${this.heatmapEnabled ? 'Disable' : 'Enable'} Heatmap`,
    })
  }

  private async floatVideo(tabId: number): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'IVE_FLOAT_VIDEO',
      })
    } catch (error) {
      console.error('Error floating video:', error)
    }
  }

  // Call this when heatmap state changes from other sources
  updateHeatmapState(enabled: boolean): void {
    if (this.heatmapEnabled !== enabled) {
      this.heatmapEnabled = enabled
      chrome.contextMenus.update('toggle-heatmap', {
        title: `${this.heatmapEnabled ? 'Disable' : 'Enable'} Heatmap`,
      })
    }
  }
}

export const contextMenuService = new ContextMenuService()
