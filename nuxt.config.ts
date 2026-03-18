// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  ssr: false, // Dashboard interne, pas besoin de SSR
  devtools: { enabled: false }, // Désactivé pour fix EBADF bug (Nuxt #29744)
  
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  
  app: {
    head: {
      title: 'OpenClaw - Architecture Multi-Agents',
      meta: [
        { name: 'description', content: 'Interface de gestion pour OpenClaw' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  
  runtimeConfig: {
    apiSecret: '',
    public: {
      apiBase: '/api',
      mattermostUrl: process.env.MATTERMOST_URL || 'http://localhost:8065',
      mattermostTeamId: process.env.MATTERMOST_TEAM_ID || ''
    }
  },
  
  devServer: {
    port: 8080,
    host: 'localhost'
  }
})
