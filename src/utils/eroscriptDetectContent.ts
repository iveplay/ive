import { ScriptMetadata, VideoSource } from '@/types/ivedb'

export type DetectedScript = {
  name: string
} & Pick<
  ScriptMetadata,
  'url' | 'creator' | 'supportUrl' | 'avgSpeed' | 'maxSpeed' | 'actionCount'
>

export type DetectedVideo = {
  label: string
} & Pick<VideoSource, 'url'>

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

  // Find all posts in the stream
  const posts = postStream.querySelectorAll('article[data-post-id]')

  posts.forEach((post) => {
    // Find all links in this specific post
    const links = post.querySelectorAll('a[href]')

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

        const creatorElement = post.querySelector('.names .username a')
        const creator = creatorElement?.textContent?.trim() || 'Unknown'

        scripts.push({
          url: fullUrl,
          name,
          creator,
          supportUrl: window.location.href,
        })
      } else if (
        !INVALID_DOMAINS.some((invalid) => fullUrl.includes(invalid))
      ) {
        videos.push({
          url: fullUrl,
          label: fullUrl.replace(/^https?:\/\//, '').replace(/^www\./, ''),
        })
      }
    })
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
  const creator = findCreatorForUrl(url)

  return {
    ...content,
    scripts: [
      ...content.scripts,
      {
        url,
        name,
        creator,
        supportUrl: window.location.href,
      },
    ],
  }
}

const findCreatorForUrl = (url: string): string => {
  const postStream = document.querySelector('.post-stream')
  if (!postStream) return 'Unknown'

  const posts = postStream.querySelectorAll('article[data-post-id]')

  for (const post of posts) {
    const links = post.querySelectorAll('a[href]')

    for (const link of links) {
      const href = link.getAttribute('href')
      if (!href) continue

      const fullUrl = href.startsWith('http')
        ? href
        : new URL(href, window.location.origin).href

      if (fullUrl === url || href === url) {
        const creatorElement = post.querySelector('.names .username a')
        return creatorElement?.textContent?.trim() || 'Unknown'
      }
    }
  }

  return 'Unknown'
}

export const getTopicMetadata = () => {
  // Title
  let titleElement = document.querySelector('#topic-title > div > h1 > a')
  if (!titleElement) {
    titleElement = document.querySelector(
      '#ember3 > div.drop-down-mode.d-header-wrap > header > div > div > div.two-rows.extra-info-wrapper > div > div > h1 > a > span',
    )
  }

  // Tags
  let tagsContainer = document.querySelector(
    '#topic-title > div > div > div > div > div',
  )
  if (!tagsContainer) {
    tagsContainer = document.querySelector(
      '#ember3 > div.drop-down-mode.d-header-wrap > header > div > div > div.two-rows.extra-info-wrapper > div > div > div.topic-header-extra > div',
    )
  }

  const tagElements = tagsContainer?.querySelectorAll('a[data-tag-name]') || []
  const tags = Array.from(tagElements)
    .map((el) => el.getAttribute('data-tag-name'))
    .filter(Boolean)

  // Thumbnail
  const contentArea = document.querySelector(
    'div.topic-owner > article > div.row > div.topic-body.clearfix > div.regular.contents',
  )
  let thumbnail = undefined

  if (contentArea) {
    const images = contentArea.querySelectorAll('img')
    for (const img of images) {
      if (!img.classList.contains('emoji')) {
        thumbnail = img.src
        break
      }
    }
  }

  return {
    title: titleElement?.textContent?.trim() || 'EroScript',
    tags: ['eroscripts', ...tags],
    thumbnail,
  }
}
