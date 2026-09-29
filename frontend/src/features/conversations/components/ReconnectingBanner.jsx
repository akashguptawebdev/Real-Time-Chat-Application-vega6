import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';

/* A fixed top banner shown when the socket connection is lost.*/
export default function ReconnectingBanner() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 backdrop-blur-sm text-amber-950 text-xs font-semibold py-2 px-4 shadow-lg animate-pulse">
      <WifiOffRoundedIcon sx={{ fontSize: 15 }} />
      Reconnecting to server... Messages will sync when connection is restored.
    </div>
  );
}
