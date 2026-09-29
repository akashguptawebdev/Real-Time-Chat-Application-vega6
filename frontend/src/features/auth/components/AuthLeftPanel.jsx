import { Box, Stack, Typography } from '@mui/material'
import ChatBubbleOutlinedIcon from '@mui/icons-material/ChatBubbleOutlined'
import BoltIcon               from '@mui/icons-material/Bolt'
import PeopleOutlinedIcon     from '@mui/icons-material/PeopleOutlined'
import ShieldOutlinedIcon     from '@mui/icons-material/ShieldOutlined'
import IconBox   from '../../../components/ui/IconBox.jsx'
import FeatureItem from './FeatureItem.jsx'

const features = [
  { icon: <BoltIcon fontSize="small" />,            title: 'Real-time messaging', desc: 'Instantly connect with your team' },
  { icon: <PeopleOutlinedIcon fontSize="small" />,  title: 'Work together',       desc: 'Share ideas and get things done' },
  { icon: <ShieldOutlinedIcon fontSize="small" />,  title: 'Secure & private',    desc: 'Your data, your control' },
]

/** AuthLeftPanel — the branded dark left side of every auth page */
export default function AuthLeftPanel() {
  return (
    <Box sx={{
      width: { xs: 0, md: '45%' },
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: 5,
      background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #1a1a3e 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Decorative circles */}
      <Box sx={{ position: 'absolute', bottom: -80, left: -80, width: 340, height: 340,
        borderRadius: '50%', background: 'rgba(99,102,241,0.15)' }} />
      <Box sx={{ position: 'absolute', bottom: 60,  left: 60,  width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(99,102,241,0.10)' }} />

      {/* Logo */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconBox bg="rgba(99,102,241,0.3)" color="#818cf8" size={36}>
          <ChatBubbleOutlinedIcon sx={{ fontSize: 20 }} />
        </IconBox>
        <Typography sx={{ color: '#e0e7ff', fontWeight: 700, fontSize: 18 }}>Chatly</Typography>
      </Stack>

      {/* Headline */}
      <Box>
        <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.2, mb: 1.5 }}>
          Better Conversations,
        </Typography>
        <Typography variant="h3" sx={{ color: '#818cf8', fontWeight: 800, lineHeight: 1.2, mb: 3 }}>
          Bigger Ideas
        </Typography>
        <Typography sx={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, maxWidth: 320 }}>
          Connect, collaborate, and chat with your team in a simple and beautiful way.
        </Typography>
      </Box>

      {/* Features */}
      <Stack spacing={3}>
        {features.map((f) => <FeatureItem key={f.title} {...f} />)}
      </Stack>
    </Box>
  )
}
