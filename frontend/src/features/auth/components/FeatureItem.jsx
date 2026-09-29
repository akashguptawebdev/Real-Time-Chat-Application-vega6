import { Stack, Typography } from '@mui/material'
import IconBox from '../../../components/ui/IconBox.jsx'

/** FeatureItem — icon box + title + subtitle row for the left panel */
export default function FeatureItem({ icon, title, desc }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
      <IconBox>{icon}</IconBox>
      <Stack>
        <Typography sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{title}</Typography>
        <Typography sx={{ color: '#64748b', fontSize: 13 }}>{desc}</Typography>
      </Stack>
    </Stack>
  )
}
