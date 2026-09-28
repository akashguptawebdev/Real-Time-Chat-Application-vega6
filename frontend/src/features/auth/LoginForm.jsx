import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Typography, Button, Checkbox, FormControlLabel,
  Divider, InputAdornment, IconButton, Stack,
} from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon  from '@mui/icons-material/LockOutlined'
import Visibility        from '@mui/icons-material/Visibility'
import VisibilityOff     from '@mui/icons-material/VisibilityOff'
import ArrowForwardIcon  from '@mui/icons-material/ArrowForward'

import api from '../../lib/api.js'
import { AuthLayout }  from './components/index.js'
import FormField       from '../../components/ui/FormField.jsx'
import ErrorAlert      from '../../components/ui/ErrorAlert.jsx'

export default function LoginForm() {
  const navigate = useNavigate()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleChange  = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('accessToken', data.accessToken)
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
        Welcome back
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: 14, mb: 3 }}>
        Sign in to your account to continue to Chatly.
      </Typography>

      <ErrorAlert message={error} />

      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5} mt={error ? 2 : 0}>

          <FormField
            label="Email address"
            name="email" type="email" required
            placeholder="you@example.com"
            value={form.email} onChange={handleChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                </InputAdornment>
              ),
            }}
          />

          <FormField
            label="Password"
            name="password" required
            type={showPass ? 'text' : 'password'}
            placeholder="Enter your password"
            value={form.password} onChange={handleChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end">
                    {showPass
                      ? <VisibilityOff sx={{ fontSize: 18, color: '#9ca3af' }} />
                      : <Visibility   sx={{ fontSize: 18, color: '#9ca3af' }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Remember me + Forgot */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <FormControlLabel
              control={
                <Checkbox size="small" checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  sx={{ color: '#d1d5db', '&.Mui-checked': { color: '#6366f1' } }}
                />
              }
              label={<Typography sx={{ fontSize: 13, color: '#374151' }}>Remember me</Typography>}
            />
            <Typography component="span" sx={{
              fontSize: 13, color: '#6366f1', cursor: 'pointer', fontWeight: 500,
              '&:hover': { textDecoration: 'underline' },
            }}>
              Forgot password?
            </Typography>
          </Stack>

          {/* Sign In */}
          <Button
            type="submit" fullWidth variant="contained"
            disabled={loading} endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' },
              borderRadius: 2, py: 1.4, fontSize: 15, fontWeight: 700,
              textTransform: 'none', boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <Divider sx={{ color: '#94a3b8', fontSize: 13 }}>or</Divider>

          {/* Google */}
          <Button
            fullWidth variant="outlined"
            startIcon={
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                width={18} height={18} alt="Google" />
            }
            sx={{
              borderColor: '#e2e8f0', color: '#374151', borderRadius: 2,
              py: 1.3, fontSize: 14, fontWeight: 600, textTransform: 'none',
              bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1' },
            }}
          >
            Continue with Google
          </Button>

        </Stack>
      </form>

      <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 14, color: '#64748b' }}>
        Don&apos;t have an account?{' '}
        <Link to="/signup" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
          Sign up
        </Link>
      </Typography>
    </AuthLayout>
  )
}
