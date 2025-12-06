export class TabTracker {
  private activeScriptTabId: number | null = null
  private activeScriptFrameId: number | null = null
  private tabUrls: Map<number, string> = new Map()

  shouldControlScript(
    sender: chrome.runtime.MessageSender | undefined,
    scriptLoaded: boolean,
    hasScript: boolean,
  ): boolean {
    if (!scriptLoaded || !hasScript) {
      return false
    }

    const tabId = sender?.tab?.id
    const frameId = sender?.frameId
    const currentUrl = sender?.tab?.url

    if (!tabId) return false

    const lastUrl = this.tabUrls.get(tabId)
    if (lastUrl && currentUrl && lastUrl !== currentUrl) {
      if (this.activeScriptTabId === tabId) {
        console.log(`URL changed in controlling tab ${tabId}, clearing script`)
        return false
      }
    }

    if (currentUrl) {
      this.tabUrls.set(tabId, currentUrl)
    }

    if (this.activeScriptTabId === null && tabId) {
      this.activeScriptTabId = tabId
      this.activeScriptFrameId = frameId || 0
      console.log(`Script control taken by tab ${tabId}, frame ${frameId}`)
      return true
    }

    if (tabId === this.activeScriptTabId) {
      if (
        frameId !== undefined &&
        frameId !== 0 &&
        this.activeScriptFrameId === 0
      ) {
        this.activeScriptFrameId = frameId
        console.log(`Frame control updated to frame ${frameId} in tab ${tabId}`)
      }
      return true
    }

    return false
  }

  setActiveTab(tabId: number, frameId?: number): void {
    this.activeScriptTabId = tabId
    this.activeScriptFrameId = frameId || 0
    console.log(
      `Script loaded in tab ${tabId}, frame ${frameId}, now controlling devices`,
    )
  }

  isActiveTab(tabId: number): boolean {
    return this.activeScriptTabId === tabId
  }

  clear(): void {
    console.log(`Clearing script for tab ${this.activeScriptTabId}`)
    this.activeScriptTabId = null
    this.activeScriptFrameId = null
  }

  clearTabUrl(tabId: number): void {
    this.tabUrls.delete(tabId)
  }

  getActiveTabId(): number | null {
    return this.activeScriptTabId
  }

  getActiveFrameId(): number | null {
    return this.activeScriptFrameId
  }
}
