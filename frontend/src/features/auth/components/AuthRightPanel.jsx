import { Box } from '@mui/material'

/**
 * AuthRightPanel — white right panel that centers its children.
 * Wrap your form content inside this.
 */
export default function AuthRightPanel({ children }) {
  return (
    <Box sx={{
      flex: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#f8fafc',
      p: { xs: 3, sm: 6 },
    }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {children}
      </Box>
    </Box>
  )
}
