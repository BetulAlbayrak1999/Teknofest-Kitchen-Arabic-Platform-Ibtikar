import axios from 'axios'
import type {
  Team,
  Individual,
  ProjectSubmission,
  ProjectSubmissionCreate,
  Evaluation,
  LoginCredentials,
  AuthToken,
  TopTeam,
} from '../types'

const API_BASE_URL = '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

// ==================== Auth ====================

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthToken> => {
    const formData = new URLSearchParams()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)

    const response = await api.post('/admin/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.data
  },

  getCurrentAdmin: async () => {
    const response = await api.get('/admin/me')
    return response.data
  },
}

// ==================== Teams ====================

export const teamsService = {
  create: async (team: Omit<Team, 'id'>): Promise<Team> => {
    const response = await api.post('/students/team', team)
    return response.data
  },

  getAll: async (): Promise<Team[]> => {
    const response = await api.get('/students/teams')
    return response.data
  },

  getById: async (id: number): Promise<Team> => {
    const response = await api.get(`/students/team/${id}`)
    return response.data
  },

  update: async (id: number, team: Partial<Team>): Promise<Team> => {
    const response = await api.put(`/students/team/${id}`, team)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/students/team/${id}`)
  },

  sendTelegramLink: async (teamId: number, telegramLink: string): Promise<void> => {
    await api.post(`/students/team/${teamId}/telegram`, { telegram_link: telegramLink })
  },
}

// ==================== Individuals ====================

export const individualsService = {
  create: async (individual: Omit<Individual, 'id'>): Promise<Individual> => {
    const response = await api.post('/students/individual', individual)
    return response.data
  },

  getAll: async (): Promise<Individual[]> => {
    const response = await api.get('/students/individuals')
    return response.data
  },

  getById: async (id: number): Promise<Individual> => {
    const response = await api.get(`/students/individual/${id}`)
    return response.data
  },

  getUnassigned: async (): Promise<Individual[]> => {
    const response = await api.get('/students/individuals?unassigned_only=true')
    return response.data
  },

  assignToTeam: async (individualIds: number[], teamName: string, field: string): Promise<Team> => {
    const response = await api.post('/students/assign-individuals', {
      individual_ids: individualIds,
      team_name: teamName,
      field: field,
    })
    return response.data
  },
}

// ==================== Projects ====================

export const projectsService = {
  submit: async (project: ProjectSubmissionCreate): Promise<ProjectSubmission> => {
    const response = await api.post('/projects/submit', project)
    return response.data
  },

  uploadAttachments: async (projectId: number, files: FormData): Promise<ProjectSubmission> => {
    const response = await api.post(`/projects/${projectId}/attachments`, files, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  getAll: async (): Promise<ProjectSubmission[]> => {
    const response = await api.get('/projects')
    return response.data
  },

  getById: async (id: number): Promise<ProjectSubmission> => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  getByTeam: async (teamId: number): Promise<ProjectSubmission[]> => {
    const response = await api.get(`/projects/team/${teamId}`)
    return response.data
  },

  exportPdf: async (projectId: number): Promise<Blob> => {
    const response = await api.get(`/projects/${projectId}/pdf`, {
      responseType: 'blob',
    })
    return response.data
  },
}

// ==================== Evaluations ====================

export const evaluationsService = {
  create: async (evaluation: Omit<Evaluation, 'id'>): Promise<Evaluation> => {
    const response = await api.post('/evaluation/evaluate', evaluation)
    return response.data
  },

  requestAIEvaluation: async (projectId: number): Promise<Evaluation> => {
    const response = await api.post('/evaluation/ai-evaluate', { project_id: projectId })
    return response.data
  },

  getByProject: async (projectId: number): Promise<Evaluation[]> => {
    const response = await api.get(`/evaluation/project/${projectId}`)
    return response.data
  },

  getTopTeams: async (limit: number = 5): Promise<TopTeam[]> => {
    const response = await api.get(`/evaluation/top-teams?limit=${limit}`)
    return response.data
  },

  toggleFeatured: async (projectId: number): Promise<{ project_id: number; is_featured: boolean; message: string }> => {
    const response = await api.post(`/evaluation/feature/${projectId}`)
    return response.data
  },

  getFeaturedProjects: async (): Promise<{ id: number; title: string; team_name: string; field: string; is_featured: boolean }[]> => {
    const response = await api.get('/evaluation/featured-projects')
    return response.data
  },
}

// ==================== Email ====================

export const emailService = {
  send: async (emails: string[], subject: string, content: string, telegramLink?: string) => {
    const response = await api.post('/email/send', {
      recipient_emails: emails,
      subject,
      content,
      telegram_link: telegramLink,
    })
    return response.data
  },
}

// ==================== Statistics ====================

export const statsService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/stats')
    return response.data
  },
}

export default api
