import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Typography, Button, Divider,
  InputAdornment, IconButton, Stack, LinearProgress, Box,
} from '@mui/material'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon  from '@mui/icons-material/LockOutlined'
import Visibility        from '@mui/icons-material/Visibility'
import VisibilityOff     from '@mui/icons-material/VisibilityOff'
import HowToRegIcon      from '@mui/icons-material/HowToReg'

import api          from '../../lib/api.js'
import { AuthLayout } from './components/index.js'
import FormField    from '../../components/ui/FormField.jsx'
import ErrorAlert   from '../../components/ui/ErrorAlert.jsx'
import GoogleSignInButton from '../../components/ui/GoogleSignInButton.jsx'
import { useAuth } from '../../hooks/useAuth.js'

// ── Password strength helper ──────────────────────────────────────────────────
const getStrength = (pwd) => {
  let score = 0
  if (pwd.length >= 6)              score++
  if (pwd.length >= 10)             score++
  if (/[A-Z]/.test(pwd))            score++
  if (/[0-9]/.test(pwd))            score++
  if (/[^A-Za-z0-9]/.test(pwd))    score++
  return score
}

const strengthConfig = [
  { label: 'Too short',  color: '#ef4444' },
  { label: 'Weak',       color: '#f97316' },
  { label: 'Fair',       color: '#eab308' },
  { label: 'Good',       color: '#22c55e' },
  { label: 'Strong',     color: '#10b981' },
  { label: 'Very strong',color: '#6366f1' },
]

function PasswordStrengthBar({ password }) {
  if (!password) return null
  const score  = getStrength(password)
  const config = strengthConfig[score] || strengthConfig[0]

  return (
    <Box>
      <LinearProgress
        variant="determinate"
        value={(score / 5) * 100}
        sx={{
          height: 4, borderRadius: 2, bgcolor: '#e2e8f0',
          '& .MuiLinearProgress-bar': { bgcolor: config.color, borderRadius: 2 },
        }}
      />
      <Typography sx={{ fontSize: 11, color: config.color, mt: 0.5, fontWeight: 500 }}>
        {config.label}
      </Typography>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SignupForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm]             = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      return setError('Passwords do not match.')
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.')
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/signup', {
        name:     form.name,
        email:    form.email,
        password: form.password,
      })
      login(data.accessToken, data.user)
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (authData) => {
    setError('')
    try {
      const { data } = await api.post('/auth/google', authData)
      login(data.accessToken, data.user)
      navigate('/chat')
    } catch (err) {
      console.error('Google auth failed:', err)
      setError(err.response?.data?.message || 'Google sign-up failed. Please try again.')
    }
  }

  // Shared password toggle adornment factory
  const eyeAdornment = (visible, toggle) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton size="small" onClick={toggle} edge="end">
          {visible
            ? <VisibilityOff sx={{ fontSize: 18, color: '#9ca3af' }} />
            : <Visibility    sx={{ fontSize: 18, color: '#9ca3af' }} />}
        </IconButton>
      </InputAdornment>
    ),
  })

  return (
    <AuthLayout>
      {/* Heading */}
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
        Create account
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: 14, mb: 3 }}>
        Join Chatly and start chatting in seconds.
      </Typography>

      <ErrorAlert message={error} />

      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5} mt={error ? 2 : 0}>

          {/* Full name */}
          <FormField
            label="Full name"
            name="name" type="text" required
            placeholder="Akash Gupta"
            value={form.name} onChange={handleChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Email */}
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

          {/* Password + strength bar */}
          <Box>
            <FormField
              label="Password"
              name="password" required
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={form.password} onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                  </InputAdornment>
                ),
                ...eyeAdornment(showPass, () => setShowPass(!showPass)),
              }}
            />
            <Box sx={{ mt: 1 }}>
              <PasswordStrengthBar password={form.password} />
            </Box>
          </Box>

          {/* Confirm password */}
          <FormField
            label="Confirm password"
            name="confirm" required
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            value={form.confirm} onChange={handleChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderColor: form.confirm && form.confirm !== form.password ? '#ef4444' : undefined,
                '& fieldset': {
                  borderColor: form.confirm && form.confirm !== form.password ? '#ef4444' : undefined,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{
                    fontSize: 18,
                    color: form.confirm && form.confirm !== form.password ? '#ef4444' : '#9ca3af',
                  }} />
                </InputAdornment>
              ),
              ...eyeAdornment(showConfirm, () => setShowConfirm(!showConfirm)),
            }}
          />

          {/* Passwords match hint */}
          {form.confirm && (
            <Typography sx={{
              fontSize: 12, mt: -1.5,
              color: form.password === form.confirm ? '#10b981' : '#ef4444',
            }}>
              {form.password === form.confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
            </Typography>
          )}

          {/* Create account button */}
          <Button
            type="submit" fullWidth variant="contained"
            disabled={loading} endIcon={<HowToRegIcon />}
            sx={{
              bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' },
              borderRadius: 2, py: 1.4, fontSize: 15, fontWeight: 700,
              textTransform: 'none', boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          <Divider sx={{ color: '#94a3b8', fontSize: 13 }}>or</Divider>

          {/* Real Working Google Sign-In */}
          <GoogleSignInButton
            onCredentialResponse={handleGoogleSuccess}
            text="signup_with"
          />

        </Stack>
      </form>

      {/* Login link */}
      <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 14, color: '#64748b' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
          Sign in
        </Link>
      </Typography>
    </AuthLayout>
  )
}
