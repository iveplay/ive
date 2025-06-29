import { useEffect } from 'react'
import logo from '@/assets/logo.png'
import { loadFaptapScript } from '@/utils/faptapUtils'

export const useFaptapCardButtons = (className: string) => {
  useEffect(() => {
    // Only run on faptap.net but not on video pages
    if (
      !window.location.hostname.includes('faptap.net') ||
      window.location.pathname.includes('/v/')
    ) {
      return
    }

    const processedCards = new Set<Element>()

    const addButtonsToCards = () => {
      // Find all video cards that haven't been processed
      const videoCards = document.querySelectorAll(
        'div.text-white.overflow-hidden',
      )

      videoCards.forEach((card) => {
        // Skip if already processed
        if (
          processedCards.has(card) ||
          card.querySelector('[data-ive-card-button="true"]')
        ) {
          return
        }

        // Find the video link within the card
        const videoLink = card.querySelector(
          'a[href^="/v/"]',
        ) as HTMLAnchorElement
        if (!videoLink) return

        const videoPath = videoLink.getAttribute('href')
        if (!videoPath) return

        // Create the IVE button with logo
        const button = document.createElement('button')
        button.className = className
        button.dataset.iveCardButton = 'true'
        button.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10;
          background: rgba(41, 11, 29, 0.95);
          border: 1px solid rgba(123, 2, 77, 0.5);
          color: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 40px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        `

        // Create and add logo image
        const logoImg = document.createElement('img')
        logoImg.src = chrome.runtime.getURL(logo)
        logoImg.style.cssText = `
          width: 28px;
          height: 28px;
          object-fit: contain;
        `
        button.appendChild(logoImg)

        // Add hover effect and loading state
        let isLoading = false

        const updateButtonState = (loading: boolean) => {
          if (loading) {
            logoImg.style.display = 'none'
            button.textContent = '...'
            button.style.opacity = '0.7'
            button.style.cursor = 'wait'
          } else {
            logoImg.style.display = 'block'
            button.textContent = ''
            button.appendChild(logoImg)
            button.style.opacity = '1'
            button.style.cursor = 'pointer'
          }
          isLoading = loading
        }

        button.addEventListener('mouseenter', () => {
          if (!isLoading) {
            button.style.background = 'rgba(61, 16, 43, 0.95)'
          }
        })
        button.addEventListener('mouseleave', () => {
          if (!isLoading) {
            button.style.background = 'rgba(41, 11, 29, 0.95)'
          }
        })

        // Handle click - use shared Faptap logic
        button.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()

          if (isLoading) return

          try {
            updateButtonState(true)

            // Extract video ID from path
            const videoId = videoPath.split('/').pop()
            if (!videoId) {
              throw new Error('Could not extract video ID from URL')
            }

            await loadFaptapScript(videoId)
          } catch (error) {
            console.error('Error loading FapTap script:', error)
            // Show error briefly
            logoImg.style.display = 'none'
            button.textContent = '✗'
            button.style.color = '#ff8a80'
            setTimeout(() => {
              button.style.color = 'white'
              updateButtonState(false)
            }, 2000)
          } finally {
            if (button.textContent !== '✗') {
              updateButtonState(false)
            }
          }
        })

        // Find the video thumbnail container and add button
        const thumbnailContainer = card.querySelector('a.block.aspect-video')
        if (thumbnailContainer) {
          // Make sure the container has relative positioning
          const containerElement = thumbnailContainer as HTMLElement
          if (getComputedStyle(containerElement).position === 'static') {
            containerElement.style.position = 'relative'
          }

          containerElement.appendChild(button)
        }

        processedCards.add(card)
      })
    }

    // Initial processing with delay for page load
    setTimeout(addButtonsToCards, 500)
    setTimeout(addButtonsToCards, 1500)
    setTimeout(addButtonsToCards, 3000)

    // Set up mutation observer to handle dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if new video cards were added
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              // Check if the added node is a video card or contains video cards
              if (
                node.matches?.('div.text-white.overflow-hidden') ||
                node.querySelector?.('div.text-white.overflow-hidden')
              ) {
                shouldProcess = true
              }
            }
          })
        }
      })

      if (shouldProcess) {
        // Add a small delay to ensure DOM is fully updated
        setTimeout(addButtonsToCards, 100)
      }
    })

    // Observe the main content area for changes
    const mainContent = document.querySelector('main') || document.body
    observer.observe(mainContent, {
      childList: true,
      subtree: true,
    })

    // Also handle scroll-based lazy loading
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(addButtonsToCards, 1000)
    }

    window.addEventListener('scroll', handleScroll)

    // Cleanup
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [className])
}
