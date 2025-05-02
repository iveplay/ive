export const extractTopicOwnerInfo = () => {
  const topicOwnerPost = document.querySelector('.topic-post.topic-owner')

  if (!topicOwnerPost) {
    return { username: null, href: null }
  }

  const usernameLink = topicOwnerPost.querySelector('.names .username a')

  if (!usernameLink) {
    return { username: null, href: null }
  }

  return {
    username: usernameLink.textContent,
    href: usernameLink.getAttribute('href'),
  }
}

export const getScriptLinkName = (scriptUrl: string) => {
  const topicOwnerPost = document.querySelector('.topic-post.topic-owner')

  if (!topicOwnerPost) {
    return null
  }

  const links = topicOwnerPost.querySelectorAll('a.attachment')

  for (const link of links) {
    const href = link.getAttribute('href')
    if (href && scriptUrl.includes(href)) {
      return link.textContent?.trim().replace('.funscript', '')
    }
  }

  return null
}
