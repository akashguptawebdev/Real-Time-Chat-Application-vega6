import { Box } from '@mui/material'

/**
 * IconBox — a rounded square container for icons.
 * @param {string}  bg      - background color / rgba
 * @param {string}  color   - icon color
 * @param {number}  size    - box width & height in px (default 36)
 */
export default function IconBox({ children, bg = 'rgba(255,255,255,0.07)', color = '#a5b4fc', size = 36 }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: 2,
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {children}
    </Box>
  )
}
