import { Menu, PlusCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useState, useCallback } from 'react';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tickets?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, navigate]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/75 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 md:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick ? <Button variant="outline" className="lg:hidden" onClick={onMenuClick}><Menu className="h-4 w-4" /></Button> : null}
        <div className="relative hidden min-w-64 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <form onSubmit={handleSearch}>
            <Input
              className="pl-9 pr-10"
              placeholder="Search tickets, users, departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          {searchQuery && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user ? <Button variant="outline" onClick={() => navigate('/tickets/new')}><PlusCircle className="mr-2 h-4 w-4" /> New Ticket</Button> : null}
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
