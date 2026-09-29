import { Box, Typography, TextField } from '@mui/material'

/**
 * FormField — label + MUI TextField pair.
 * Accepts all standard TextField props plus a `label` string.
 */
export default function FormField({ label, InputProps, slotProps, ...props }) {
  const mergedSlotProps = {
    ...slotProps,
    input: {
      ...(slotProps?.input || {}),
      ...(InputProps || {}),
    },
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.8 }}>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        slotProps={mergedSlotProps}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2, bgcolor: '#fff', fontSize: 14,
            '&:hover fieldset':   { borderColor: '#6366f1' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1' },
          },
        }}
        {...props}
      />
    </Box>
  )
}
