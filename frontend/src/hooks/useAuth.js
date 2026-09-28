import { useState, useEffect } from 'react'
import api from '../lib/api.js'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setLoading(false); return }

    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => { localStorage.removeItem('accessToken'); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('accessToken')
    setUser(null)
    window.location.href = '/login'
  }

  return { user, setUser, loading, logout }
}
