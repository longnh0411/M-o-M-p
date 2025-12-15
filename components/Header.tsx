import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Wallet, Moon, Sun, Upload, Download, Home, User, Users, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentMonth: string; // YYYY-MM
  onChangeMonth: (direction: -1 | 1) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  appMode?: 'personal' | 'group' | 'selection';
  onSwitchMode?: () => void;
  // Group Specific
  selectedEventName?: string;
  onBackToGroupList?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentMonth, 
  onChangeMonth, 
  isDarkMode, 
  toggleTheme,
  onImport,
  onExport,
  appMode = 'personal',
  onSwitchMode,
  selectedEventName,
  onBackToGroupList
}) => {
  const [year, month] = currentMonth.split('-').map(Number);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Format readable month in Vietnamese
  const displayDate = new Date(year, month - 1).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric'
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const isGroupDetail = appMode === 'group' && selectedEventName;

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 gap-4">
      <div className="flex items-center gap-3">
        {/* Navigation Button Logic */}
        {isGroupDetail ? (
           <button 
             onClick={onBackToGroupList}
             className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
             title="Quay lại danh sách"
           >
             <ArrowLeft size={20} />
           </button>
        ) : (
           onSwitchMode && (
            <button 
               onClick={onSwitchMode}
               className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
               title="Màn hình chính"
            >
               <Home size={20} />
            </button>
          )
        )}

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm rotate-3 ${appMode === 'group' ? 'bg-cute-yellow text-orange-600' : 'bg-cute-pink'}`}>
            {appMode === 'group' ? <Users size={20} /> : <Wallet size={20} />}
        </div>
        
        <div className="flex flex-col">
            {isGroupDetail ? (
                <>
                  <h1 className="text-xl font-bold text-gray-700 dark:text-white tracking-tight leading-none truncate max-w-[200px]">{selectedEventName}</h1>
                  <span className="text-xs text-gray-400 dark:text-gray-500">Chi tiết đợt</span>
                </>
            ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-700 dark:text-white tracking-tight transition-colors leading-none">Mèo Mập</h1>
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500 mt-1">
                      {appMode === 'group' ? <Users size={12} /> : <User size={12} />}
                      <span className="uppercase tracking-wide">{appMode === 'group' ? 'Nhóm / Quỹ VIP' : 'Cá nhân'}</span>
                  </div>
                </>
            )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Hidden File Input: Accept JSON and CSV */}
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={onImport}
            accept=".json,.csv"
            className="hidden"
        />

        <button
          onClick={handleImportClick}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-transparent hover:bg-green-500 hover:text-white transition-all"
          title="Nhập dữ liệu (JSON hoặc CSV)"
        >
          <Upload size={18} />
        </button>

        <button
          onClick={onExport}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-transparent hover:bg-blue-500 hover:text-white transition-all"
          title="Xuất dữ liệu JSON"
        >
          <Download size={18} />
        </button>

        {/* Date Navigator: Only show in Personal Mode OR Group Detail Mode (to filter by date if needed, but for now we hide in Group Dashboard) */}
        {(!appMode || appMode === 'personal') && (
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
        )}

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