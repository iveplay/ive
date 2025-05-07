export const chromeStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const data = await chrome.storage.sync.get(name)
      return data[name] || null
    } catch (error) {
      console.error(`Error getting item ${name} from chrome storage:`, error)
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await chrome.storage.sync.set({ [name]: value })
    } catch (error) {
      console.error(`Error setting item ${name} in chrome storage:`, error)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.sync.remove(name)
    } catch (error) {
      console.error(`Error removing item ${name} from chrome storage:`, error)
    }
  },
}
