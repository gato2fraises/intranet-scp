// API Configuration
export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api'

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}
