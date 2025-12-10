import React from 'react';
import { ChevronLeft, ChevronRight, Wallet, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  currentMonth: string; // YYYY-MM
  onChangeMonth: (direction: -1 | 1) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMonth, onChangeMonth, isDarkMode, toggleTheme }) => {
  const [year, month] = currentMonth.split('-').map(Number);
  
  // Format readable month in Vietnamese
  const displayDate = new Date(year, month - 1).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-cute-pink rounded-xl flex items-center justify-center text-white shadow-sm rotate-3">
            <Wallet size={20} />
        </div>
        <h1 className="text-2xl font-bold text-gray-700 dark:text-white tracking-tight transition-colors">Mèo Mập</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
            <button 
            onClick={() => onChangeMonth(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
            >
            <ChevronLeft size={18} />
            </button>
            <span className="px-4 font-semibold text-gray-700 dark:text-gray-200 min-w-[140px] text-center capitalize">
            {displayDate}
            </span>
            <button 
            onClick={() => onChangeMonth(1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
            >
            <ChevronRight size={18} />
            </button>
        </div>

        <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-gray-500 dark:text-yellow-300 border border-gray-100 dark:border-slate-700 shadow-sm hover:scale-110 transition-all"
            aria-label="Toggle Dark Mode"
        >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};