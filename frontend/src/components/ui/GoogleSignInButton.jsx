import { useEffect, useRef, useState } from 'react'
import { Button, CircularProgress } from '@mui/material'

const GOOGLE_CLIENT_ID = '627956378406-lnomh4ap4ummcrr7ljrblkekv3adus6f.apps.googleusercontent.com'

export default function GoogleSignInButton({ onCredentialResponse, text = 'continue_with' }) {
  const [loading, setLoading] = useState(false)
  const callbackRef = useRef(onCredentialResponse)

  useEffect(() => {
    callbackRef.current = onCredentialResponse
  }, [onCredentialResponse])

  // Ensure Google Identity Services script is present
  useEffect(() => {
    if (!window.google?.accounts?.oauth2) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const handleGoogleClick = () => {
    try {
      setLoading(true)

      if (window.google?.accounts?.oauth2) {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            setLoading(false)
            if (tokenResponse.error) {
              console.error('Google OAuth error:', tokenResponse)
              return
            }
            if (tokenResponse.access_token && callbackRef.current) {
              callbackRef.current({ accessToken: tokenResponse.access_token })
            }
          },
        })
        tokenClient.requestAccessToken({ prompt: 'select_account' })
      } else {
        // Fallback: If Google script not yet ready, try Google ID prompt
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (res) => {
              setLoading(false)
              if (callbackRef.current) callbackRef.current(res)
            },
          })
          window.google.accounts.id.prompt()
        } else {
          setLoading(false)
          alert('Google services are still loading. Please try again in a moment.')
        }
      }
    } catch (err) {
      console.error('Google click handler error:', err)
      setLoading(false)
    }
  }

  return (
    <Button
      fullWidth
      variant="outlined"
      onClick={handleGoogleClick}
      disabled={loading}
      startIcon={
        loading ? (
          <CircularProgress size={18} sx={{ color: '#6366f1' }} />
        ) : (
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            width={18}
            height={18}
            alt="Google"
          />
        )
      }
      sx={{
        borderColor: '#e2e8f0',
        color: '#374151',
        borderRadius: 2,
        py: 1.3,
        fontSize: 14,
        fontWeight: 600,
        textTransform: 'none',
        bgcolor: '#fff',
        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#cbd5e1' },
      }}
    >
      {loading
        ? 'Connecting to Google...'
        : text === 'signup_with'
        ? 'Sign up with Google'
        : 'Continue with Google'}
    </Button>
  )
}
