import { Box, Typography } from '@mui/material'

/** ErrorAlert — red inline alert for form errors */
export default function ErrorAlert({ message }) {
  if (!message) return null
  return (
    <Box sx={{
      bgcolor: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: 2, px: 2, py: 1.5,
    }}>
      <Typography sx={{ color: '#dc2626', fontSize: 13 }}>{message}</Typography>
    </Box>
  )
}
