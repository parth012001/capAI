import { motion } from 'framer-motion';

export const Footer = () => {
  return (
    <footer className="py-10 px-6 bg-slate-900">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
        <div className="mb-4 md:mb-0">
          © 2025 Captain AI. All rights reserved.
        </div>
        <div className="flex space-x-8">
          <motion.a
            href="/privacy"
            className="hover:text-white transition-colors"
            whileHover={{ scale: 1.1, color: '#ffffff' }}
          >
            Privacy
          </motion.a>
          <motion.a
            href="/terms"
            className="hover:text-white transition-colors"
            whileHover={{ scale: 1.1, color: '#ffffff' }}
          >
            Terms
          </motion.a>
        </div>
      </div>
    </footer>
  );
};
