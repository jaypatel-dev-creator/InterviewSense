import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Sessions
export const createSession = (payload) =>
  api.post('/api/sessions', payload).then((r) => r.data)

export const listSessions = () =>
  api.get('/api/sessions').then((r) => r.data)

export const getSession = (sessionId) =>
  api.get(`/api/sessions/${sessionId}`).then((r) => r.data)

export const deleteSession = (sessionId) =>
  api.delete(`/api/sessions/${sessionId}`)

export const getSessionTurns = (sessionId) =>
  api.get(`/api/sessions/${sessionId}/turns`).then((r) => r.data)

export const getSessionReport = (sessionId) =>
  api.get(`/api/sessions/${sessionId}/report`).then((r) => r.data)

export const healthCheck = () =>
  api.get('/api/health').then((r) => r.data)

export default api