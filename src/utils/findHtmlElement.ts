export const findHtmlElement = (selectors: string): Promise<Element | null> => {
  return new Promise((resolve) => {
    let attempts = 0
    const maxAttempts = 5

    function findElement() {
      const element = document.querySelector(selectors)
      if (element) {
        resolve(element)
      } else if (attempts < maxAttempts) {
        attempts++
        setTimeout(findElement, 1000)
      } else {
        resolve(null) // Resolve with null after max attempts
      }
    }

    findElement()
  })
}
