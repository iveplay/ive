type DetectedScript = {
  url: string
  name: string
}

type DetectedVideo = {
  url: string
  label: string
}

export type EroscriptContent = {
  scripts: DetectedScript[]
  videos: DetectedVideo[]
}

const INVALID_DOMAINS = [
  'patreon',
  'gumroad',
  'ko-fi',
  'buymeacoffee',
  'paypal',
  'venmo',
  'cashapp',
  'discuss.eroscripts',
  'eroscripts',
  'reddit',
  'discord',
  'github',
  'imgur',
  'funscript',
  'donate',
  'twitter',
  'youtube',
]

export const eroscriptDetectContent = (): EroscriptContent => {
  const postStream = document.querySelector('.post-stream')
  if (!postStream) return { scripts: [], videos: [] }

  const scripts: DetectedScript[] = []
  const videos: DetectedVideo[] = []
  const seenUrls = new Set<string>()

  // Find all links in the post stream
  const links = postStream.querySelectorAll('a[href]')

  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (!href || seenUrls.has(href)) return

    seenUrls.add(href)

    // Convert relative URLs to absolute
    const fullUrl = href.startsWith('http')
      ? href
      : new URL(href, window.location.origin).href

    if (href.endsWith('.funscript')) {
      const name = link.textContent?.trim().replace('.funscript', '') || href

      scripts.push({
        url: fullUrl,
        name,
      })
    } else if (!INVALID_DOMAINS.some((invalid) => fullUrl.includes(invalid))) {
      videos.push({
        url: fullUrl,
        label: fullUrl.replace(/^https?:\/\//, '').replace(/^www\./, ''),
      })
    }
  })

  // Remove duplicates
  const uniqueScripts = scripts.filter(
    (script, index, arr) =>
      arr.findIndex((s) => s.url === script.url) === index,
  )
  const uniqueVideos = videos.filter(
    (video, index, arr) => arr.findIndex((v) => v.url === video.url) === index,
  )

  return { scripts: uniqueScripts, videos: uniqueVideos }
}

export const addVideoToContent = (
  content: EroscriptContent,
  url: string,
): EroscriptContent => {
  const exists = content.videos.some((v) => v.url === url)
  if (exists) return content

  const label = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
  return {
    ...content,
    videos: [...content.videos, { url, label }],
  }
}

export const addScriptToContent = (
  content: EroscriptContent,
  url: string,
): EroscriptContent => {
  const exists = content.scripts.some((s) => s.url === url)
  if (exists) return content

  const name = url.split('/').pop()?.replace('.funscript', '') || 'Script'
  return {
    ...content,
    scripts: [...content.scripts, { url, name }],
  }
}
