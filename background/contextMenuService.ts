import { deviceService } from './deviceService/service'
import { CONTEXT_MESSAGES } from './types'

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

    // Link context menus - only on EroScript pages
    chrome.contextMenus.create({
      id: 'add-as-video',
      title: 'IVE: Select as video',
      contexts: ['link'],
      documentUrlPatterns: ['*://discuss.eroscripts.com/*'],
    })

    chrome.contextMenus.create({
      id: 'add-as-script',
      title: 'IVE: Select as script',
      contexts: ['link'],
      documentUrlPatterns: ['*://discuss.eroscripts.com/*'],
      targetUrlPatterns: ['*://*/*.funscript*'],
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
          case 'add-as-video':
            if (tab?.id && info.linkUrl) {
              await this.addAsVideo(tab.id, info.linkUrl)
            }
            break
          case 'add-as-script':
            if (tab?.id && info.linkUrl) {
              await this.addAsScript(tab.id, info.linkUrl)
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
        type: CONTEXT_MESSAGES.FLOAT_VIDEO,
      })
    } catch (error) {
      console.error('Error floating video:', error)
    }
  }

  private async addAsVideo(tabId: number, linkUrl: string): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: CONTEXT_MESSAGES.EROSCRIPTS_VIDEO,
        url: linkUrl,
      })
    } catch (error) {
      console.error('Error adding as video:', error)
    }
  }

  private async addAsScript(tabId: number, linkUrl: string): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: CONTEXT_MESSAGES.EROSCRIPTS_SCRIPT,
        url: linkUrl,
      })
    } catch (error) {
      console.error('Error adding as script:', error)
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
