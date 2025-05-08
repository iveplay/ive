import { useEffect } from 'react'
import { UAParser } from 'ua-parser-js'

const parser = new UAParser().getResult()

export const useMobileEroLoadButtons = (
  processDroppedUrl: (url: string) => void,
  className: string,
) => {
  useEffect(() => {
    const deviceType = parser.device.type
    if (deviceType !== 'mobile' && deviceType !== 'tablet') return

    const processedLinks = new Set()

    const addLoadButtons = () => {
      const postsWrapper = document.querySelector('.posts-wrapper')
      if (!postsWrapper) return

      const links = postsWrapper.querySelectorAll('a[data-clicks]')

      links.forEach((link) => {
        // Skip if we already processed this link or if it already has our button as next sibling
        if (
          processedLinks.has(link) ||
          (link.nextSibling &&
            (link.nextSibling as Element).id === 'ive-load-button')
        ) {
          return
        }

        const button = document.createElement('button')
        button.id = 'ive-load-button'
        button.className = className
        button.textContent = 'ive'
        button.dataset.iveButton = 'true' // Mark as our button
        button.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()

          const url = link.getAttribute('href')
          if (url) {
            const fullUrl = url.startsWith('http')
              ? url
              : window.location.origin + url

            processDroppedUrl(fullUrl)
          }
        })

        if (link.nextSibling) {
          link.parentNode?.insertBefore(button, link.nextSibling)
        } else {
          link.parentNode?.appendChild(button)
        }

        processedLinks.add(link)
      })
    }

    addLoadButtons()

    const postsWrapper = document.querySelector('.posts-wrapper')
    if (postsWrapper) {
      const observer = new MutationObserver((mutations) => {
        const shouldProcess = mutations.some((mutation) => {
          if (mutation.type !== 'childList') return false

          for (const node of Array.from(mutation.addedNodes)) {
            // Skip our own buttons
            if (node instanceof Element && node.id === 'ive-load-button') {
              continue
            }
            return true
          }

          return false
        })

        if (shouldProcess) {
          addLoadButtons()
        }
      })

      observer.observe(postsWrapper, {
        childList: true,
        subtree: true,
      })

      return () => {
        observer.disconnect()
      }
    }
  }, [processDroppedUrl, className])
}
