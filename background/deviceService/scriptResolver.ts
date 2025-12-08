import { Funscript, ScriptData } from 'ive-connect'
import { localScriptsService } from '../localScripts.service'

export class ScriptResolver {
  async resolve(url: string, handyConnectionKey: string): Promise<ScriptData> {
    if (url.startsWith('file://')) {
      return this.resolveLocalScript(url)
    }

    if (url.startsWith('ivdb://')) {
      return this.resolveIvdbScript(url, handyConnectionKey)
    }

    return this.resolveUrlScript(url)
  }

  private async resolveLocalScript(url: string): Promise<ScriptData> {
    const scriptId = url.replace('file://', '')
    const content = await localScriptsService.getScript(scriptId)

    if (!content) {
      throw new Error('Local script not found')
    }

    return { type: 'funscript', content: content as Funscript }
  }

  private async resolveIvdbScript(
    ivdbUrl: string,
    handyConnectionKey: string,
  ): Promise<ScriptData> {
    const match = ivdbUrl.match(/^ivdb:\/\/([^/]+)\/(.+)$/)
    if (!match) {
      throw new Error('Invalid IVDB script URL format')
    }

    const [, videoId, scriptId] = match

    if (!handyConnectionKey) {
      throw new Error('Handy connection key required for IVDB scripts')
    }

    try {
      const tokenResponse = await fetch(
        `https://scripts01.handyfeeling.com/api/script/index/v0/videos/${videoId}/scripts/${scriptId}/token`,
        { headers: { Authorization: `Bearer ${handyConnectionKey}` } },
      )

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get script token: ${tokenResponse.status}`)
      }

      const tokenData = await tokenResponse.json()

      if (!tokenData.url) {
        throw new Error('Invalid script token response')
      }

      return {
        type: tokenData.url.toLowerCase().split('.').pop() || 'funscript',
        url: tokenData.url,
      }
    } catch (error) {
      throw new Error(
        `IVDB script resolution failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private resolveUrlScript(url: string): ScriptData {
    return {
      type: url.toLowerCase().split('.').pop() || 'funscript',
      url,
    }
  }

  async extractCloudflareUrl(scriptUrl: string): Promise<string | null> {
    try {
      const response = await fetch(scriptUrl)

      if (!response.ok) {
        console.error('Error getting funscript:', response)
        throw new Error(`Failed to fetch funscript: ${response.status}`)
      }

      const responseText = await response.text()

      const funscriptPathMatch = responseText.match(
        /["']([^"']*\.funscript[^"']*?)["']/,
      )
      const cZoneMatch = responseText.match(/cZone:\s*['"]([^'"]+)['"]/)

      if (funscriptPathMatch && cZoneMatch) {
        let path = funscriptPathMatch[1]
        const cZone = cZoneMatch[1]

        const questionMarkIndex = path.indexOf('?')
        if (questionMarkIndex !== -1) {
          path = path.substring(0, questionMarkIndex)
        }

        return `https://${cZone}${path}`
      }

      return null
    } catch (error) {
      console.error('Error extracting URL from HTML:', error)
      return null
    }
  }
}
