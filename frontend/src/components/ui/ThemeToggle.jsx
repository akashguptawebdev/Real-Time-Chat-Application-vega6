import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
        isDark
          ? 'text-amber-300 hover:text-amber-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 shadow-sm'
          : 'text-indigo-600 hover:text-indigo-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 shadow-sm'
      } ${className}`}
    >
      {isDark ? (
        <LightModeRoundedIcon sx={{ fontSize: 18 }} />
      ) : (
        <DarkModeRoundedIcon sx={{ fontSize: 18 }} />
      )}
    </button>
  );
}
