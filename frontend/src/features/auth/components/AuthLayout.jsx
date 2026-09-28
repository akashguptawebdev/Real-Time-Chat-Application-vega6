import { Box } from '@mui/material'
import AuthLeftPanel  from './AuthLeftPanel.jsx'
import AuthRightPanel from './AuthRightPanel.jsx'

/**
 * AuthLayout — the split-panel shell used by Login and Signup.
 * Usage:
 *   <AuthLayout>
 *     <YourFormContent />
 *   </AuthLayout>
 */
export default function AuthLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <AuthLeftPanel />
      <AuthRightPanel>{children}</AuthRightPanel>
    </Box>
  )
}
