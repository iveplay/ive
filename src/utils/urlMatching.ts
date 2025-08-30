import { IveEntry } from '@/types/ivedb'
import { getAllEntries, getEntry } from '@/utils/iveDbUtils'

// Normalize URL for comparison
const normalizeUrl = (url: string): string => {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '') // Remove trailing slashes
    .toLowerCase()
}

// Extract domain from URL
const getDomain = (url: string): string => {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      .replace(/^www\./, '')
      .toLowerCase()
  } catch {
    return ''
  }
}

// Check if two URLs match (exact or domain match)
const urlsMatch = (url1: string, url2: string): boolean => {
  const norm1 = normalizeUrl(url1)
  const norm2 = normalizeUrl(url2)

  // Exact match
  if (norm1 === norm2) return true

  // Domain match
  const domain1 = getDomain(url1)
  const domain2 = getDomain(url2)

  if (domain1 && domain2 && domain1 === domain2) return true

  // Subdomain match
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true

  return false
}

// Find IveDB entry that matches current URL
export const findMatchingEntry = async (
  currentUrl: string,
): Promise<IveEntry | null> => {
  try {
    const allEntries = await getAllEntries()

    for (const entry of allEntries) {
      const entryDetails = await getEntry(entry.id)
      if (!entryDetails) continue

      // Check if any video source URL matches the current page
      const hasMatchingVideo = entryDetails.videoSources.some((videoSource) =>
        urlsMatch(currentUrl, videoSource.url),
      )

      if (hasMatchingVideo) {
        return entry
      }
    }

    return null
  } catch (error) {
    console.error('Error finding matching entry:', error)
    return null
  }
}

// Check if URL matches custom URLs from settings
export const matchesCustomUrls = (
  url: string,
  customUrls: string[],
): boolean => {
  return customUrls.some((customUrl) => urlsMatch(url, customUrl))
}

// Get custom URLs from settings
export const getCustomUrls = async (): Promise<string[]> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ive:get_state',
    })
    return response.customUrls || []
  } catch (error) {
    console.error('Error getting custom URLs:', error)
    return []
  }
}
