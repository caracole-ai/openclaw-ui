export type IdeaStatut = 'a-explorer' | 'en-revue' | 'approuvee' | 'rejetee' | 'promue'
export type IdeaEnergie = 'haute' | 'moyenne' | 'basse'

export interface Idea {
  id: string
  titre: string
  date: string
  themes: string[]
  energie: IdeaEnergie
  statut: IdeaStatut
  source: string
  projetLie: string | null
  scoreRealisme: number
  scoreEffort: number
  scoreImpact: number
  reviewedAt: string | null
  bodyPreview: string
  body?: string
  vaultPath: string
  createdAt: string
  updatedAt: string
}
