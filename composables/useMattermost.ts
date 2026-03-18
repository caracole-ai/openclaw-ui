/**
 * Composable pour accéder aux infos Mattermost depuis le frontend
 * Usage: const { getMattermostChannelUrl } = useMattermost()
 */
export const useMattermost = () => {
  const config = useRuntimeConfig()
  
  const mattermostUrl = computed(() => config.public.mattermostUrl)
  const mattermostTeamId = computed(() => config.public.mattermostTeamId)
  
  /**
   * Génère l'URL d'un canal Mattermost
   * @param channelId - ID du canal
   * @returns URL complète du canal
   */
  const getMattermostChannelUrl = (channelId: string): string => {
    return `${mattermostUrl.value}/${mattermostTeamId.value}/channels/${channelId}`
  }
  
  return {
    mattermostUrl,
    mattermostTeamId,
    getMattermostChannelUrl
  }
}
