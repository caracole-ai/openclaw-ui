import type { DocumentStatus } from '~/types/project'

/**
 * Composable pour gérer l'affichage du statut de document IDEAS
 */
export const useDocumentStatus = () => {
  const getStatusConfig = (status?: DocumentStatus) => {
    if (!status) return null
    
    const configs = {
      pending: {
        label: 'En attente',
        icon: '🕐',
        variant: 'secondary' as const,
        color: 'text-gray-600'
      },
      in_progress: {
        label: 'En cours',
        icon: '⚙️',
        variant: 'info' as const,
        color: 'text-blue-600'
      },
      completed: {
        label: 'Complété',
        icon: '✅',
        variant: 'success' as const,
        color: 'text-green-600'
      }
    }
    
    return configs[status]
  }
  
  return {
    getStatusConfig
  }
}
