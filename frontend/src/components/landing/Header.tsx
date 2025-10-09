import { motion } from 'framer-motion';
import { Button } from '../ui/Button';

interface HeaderProps {
  isScrolled: boolean;
  onSignIn: () => void;
  onNavigate: (section: string) => void;
}

export const Header = ({ isScrolled, onSignIn, onNavigate }: HeaderProps) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-lg shadow-lg border-b border-slate-200/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <motion.div
          className="flex items-center space-x-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <img src="/Logo.png" alt="Captain AI" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Captain AI
          </span>
        </motion.div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8">
          <button
            onClick={() => onNavigate('features')}
            className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            Features
          </button>
          <button
            onClick={() => onNavigate('how-it-works')}
            className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            How It Works
          </button>
          <button
            onClick={() => onNavigate('security')}
            className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            Security
          </button>
        </nav>

        <Button
          variant="outline"
          size="default"
          onClick={onSignIn}
          className="border-2 border-blue-600/20 hover:border-blue-600 hover:bg-blue-50 text-blue-600 font-semibold transition-all duration-200 px-6 py-2 flex items-center gap-2 group"
        >
          <span>Sign In</span>
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </motion.header>
  );
};
