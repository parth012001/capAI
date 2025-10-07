import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

interface LegalPageLayoutProps {
  content: string;
  className?: string;
}

export default function LegalPageLayout({ content, className }: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/Logo.png" alt="Captain AI" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold text-slate-900">Captain AI</span>
          </div>
          <Button variant="ghost" size="default" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
          <div className="mb-4 md:mb-0">
            © 2025 Captain AI. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
