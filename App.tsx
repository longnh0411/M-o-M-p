import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  Trash2, Sparkles, Lock, Unlock, CheckCircle, 
  PieChart as PieChartIcon, BarChart3, Edit2,
  ArrowDownWideNarrow, ArrowUpNarrowWide, CalendarDays, Layers, ListFilter,
  User, Users, Wallet, Sun, Moon, Plus, Search, Crown, Calendar
} from 'lucide-react';

// Local Components & Services
import { Header } from './components/Header';
import { ExpenseForm } from './components/ExpenseForm';
import { GroupEventModal } from './components/GroupEventModal';
import { analyzeSpending } from './services/geminiService';
import { Expense, MonthlySession, GeminiAnalysis, CategoryType, GroupEvent } from './types';
import { CATEGORIES, CHART_COLORS, INITIAL_ADVICE } from './constants';

// --- Utils (Reused) ---
const detectCategory = (text: string): CategoryType => {
    if (!text) return CategoryType.OTHER;
    const lower = text.toString().toLowerCase().trim();
    if (Object.keys(CATEGORIES).includes(text.toUpperCase())) return text.toUpperCase() as CategoryType;
    for (const cat of Object.values(CATEGORIES)) {
        if (lower === cat.label.toLowerCase() || lower.includes(cat.label.toLowerCase())) return cat.id;
    }
    if (lower.includes('ăn') || lower.includes('food') || lower.includes('bún') || lower.includes('phở') || lower.includes('cơm') || lower.includes('trà sữa')) return CategoryType.FOOD;
    if (lower.includes('cafe') || lower.includes('cà phê') || lower.includes('trà') || lower.includes('nước') || lower.includes('uống')) return CategoryType.COFFEE;
    if (lower.includes('nhà') || lower.includes('điện') || lower.includes('nước') || lower.includes('net') || lower.includes('wifi') || lower.includes('internet') || lower.includes('gas') || lower.includes('housing')) return CategoryType.HOUSING;
    if (lower.includes('mua') || lower.includes('sắm') || lower.includes('áo') || lower.includes('quần') || lower.includes('shopee') || lower.includes('shopping') || lower.includes('cá nhân') || lower.includes('tạp hóa')) return CategoryType.SHOPPING;
    if (lower.includes('xe') || lower.includes('xăng') || lower.includes('grab') || lower.includes('be') || lower.includes('đi lại') || lower.includes('gửi xe') || lower.includes('taxi')) return CategoryType.TRANSPORT;
    if (lower.includes('công ty') || lower.includes('đầu tư') || lower.includes('quỹ')) return CategoryType.OTHER;
    return CategoryType.OTHER;
};
const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const clean = val.replace(/[^0-9]/g, '');
        return parseFloat(clean);
    }
    return 0;
};
const normalizeExpense = (item: any): Partial<Expense> | null => {
    const amountVal = item.amount || item.so_tien || item.tien || item.money || item.Amount || item['Số tiền'] || item['Thành tiền'];
    const amount = parseAmount(amountVal);
    if (!amount || amount === 0) return null;
    const dateVal = item.date || item.ngay || item.thoi_gian || item.Date || item['Ngày'] || item['Thời gian'];
    let date = new Date().toISOString();
    if (dateVal) {
        if (typeof dateVal === 'string' && (dateVal.includes('/') || dateVal.includes('-'))) {
             const parts = dateVal.split(/[-/]/);
             if (parts.length === 3) {
                 const p0 = parseInt(parts[0]);
                 const p1 = parseInt(parts[1]);
                 const p2 = parseInt(parts[2]);
                 if (p2 > 1000) { const d = new Date(p2, p1 - 1, p0); if (!isNaN(d.getTime())) date = d.toISOString(); } 
                 else if (p0 > 1000) { const d = new Date(p0, p1 - 1, p2); if (!isNaN(d.getTime())) date = d.toISOString(); }
             }
        } else { const d = new Date(dateVal); if (!isNaN(d.getTime())) date = d.toISOString(); }
    }
    const note = item.detail || item.note || item.ghi_chu || item.noi_dung || item.mo_ta || item.Note || item['Ghi chú'] || item['Nội dung'] || item['Diễn giải'] || '';
    const catRaw = item.category || item.danh_muc || item.loai || item.Category || item['Danh mục'] || item['Loại'];
    const category = catRaw ? detectCategory(catRaw) : detectCategory(note);
    return { amount, date, note: String(note), category };
};
const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];
    const result = [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const hasHeaders = headers.some(h => ['ngày', 'date', 'số tiền', 'amount', 'nội dung', 'note'].some(k => h.toLowerCase().includes(k)));
    const startRow = hasHeaders ? 1 : 0;
    for (let i = startRow; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (row.length < 2) continue;
        const obj: any = {};
        if (hasHeaders) { headers.forEach((h, idx) => { obj[h] = row[idx]; }); } 
        else { obj['date'] = row[0]; obj['amount'] = row[1]; obj['note'] = row[2]; obj['category'] = row[3] || row[2]; }
        result.push(obj);
    }
    return result;
};

// --- Swipeable Item Component ---
interface SwipeableItemProps {
    children: React.ReactNode;
    onEdit: () => void;
    onDelete: () => void;
    isLocked: boolean;
    className?: string;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ children, onEdit, onDelete, isLocked, className = '' }) => {
    const [offsetX, setOffsetX] = useState(0);
    const startX = useRef<number | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);
    const ACTION_WIDTH = 140; // Total width of actions

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isLocked) return;
        startX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isLocked || startX.current === null) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;

        // Only allow swiping left (negative) and cap it
        if (diff < 0) {
            setOffsetX(Math.max(diff, -ACTION_WIDTH));
        } else {
             // If swiping right, only allow if it's currently open
             setOffsetX(Math.min(diff, 0)); 
        }
    };

    const handleTouchEnd = () => {
        if (isLocked) return;
        startX.current = null;
        if (offsetX < -50) {
            setOffsetX(-ACTION_WIDTH); // Snap open
        } else {
            setOffsetX(0); // Snap close
        }
    };
    
    // Auto close if clicking outside or on content
    const resetSwipe = () => setOffsetX(0);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Background Actions */}
            <div className="absolute top-0 bottom-0 right-0 flex w-[140px] z-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(); resetSwipe(); }}
                    className="flex-1 bg-blue-500 text-white flex flex-col items-center justify-center"
                >
                    <Edit2 size={18} />
                    <span className="text-[10px] font-bold mt-1">Sửa</span>
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); resetSwipe(); }}
                    className="flex-1 bg-red-500 text-white flex flex-col items-center justify-center"
                >
                    <Trash2 size={18} />
                    <span className="text-[10px] font-bold mt-1">Xóa</span>
                </button>
            </div>

            {/* Foreground Content */}
            <div 
                ref={itemRef}
                className="relative bg-white dark:bg-slate-800 z-10 transition-transform duration-200 ease-out touch-pan-y"
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={resetSwipe}
            >
                {children}
            </div>
        </div>
    );
};


const App: React.FC = () => {
  // --- Mode State ---
  const [appMode, setAppMode] = useState<'selection' | 'personal' | 'group'>('selection');

  // --- Personal Mode State ---
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sessions, setSessions] = useState<Record<string, MonthlySession>>({});

  // --- Group Mode State ---
  const [groupEvents, setGroupEvents] = useState<GroupEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [groupTab, setGroupTab] = useState<'OWNER' | 'MEMBER'>('OWNER');
  const [groupSearch, setGroupSearch] = useState('');

  // --- Common State ---
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis>({ message: INITIAL_ADVICE, mood: 'happy' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [sortMode, setSortMode] = useState<'date' | 'price-desc' | 'price-asc'>('date');
  const [isGrouped, setIsGrouped] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // --- Effects ---
  useEffect(() => {
      const savedPersonal = localStorage.getItem('meoMapSessions');
      if (savedPersonal) {
        try { setSessions(JSON.parse(savedPersonal)); } catch (e) { console.error(e); }
      }
      const savedGroup = localStorage.getItem('meoMapGroupEvents');
      if (savedGroup) {
          try { setGroupEvents(JSON.parse(savedGroup)); } catch(e) { console.error(e); }
      }
  }, []);

  useEffect(() => {
      if (Object.keys(sessions).length > 0) localStorage.setItem('meoMapSessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
      if (groupEvents.length > 0 || appMode === 'group') localStorage.setItem('meoMapGroupEvents', JSON.stringify(groupEvents));
  }, [groupEvents, appMode]);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- Navigation & Computed ---
  const handleSelectMode = (mode: 'personal' | 'group') => {
    setAppMode(mode);
    setGeminiAnalysis({ message: INITIAL_ADVICE, mood: 'happy' });
    setSelectedEventId(null);
  };
  const handleSwitchMode = () => { setAppMode('selection'); setSelectedEventId(null); };
  const handleBackToGroupList = () => { setSelectedEventId(null); setGeminiAnalysis({ message: INITIAL_ADVICE, mood: 'happy' }); };

  const activeContextData = useMemo(() => {
      if (appMode === 'personal') {
          const session = sessions[currentMonth] || { id: currentMonth, expenses: [] };
          return { expenses: session.expenses, isLocked: session.isCompleted || false, title: 'Tháng này' };
      } else if (appMode === 'group' && selectedEventId) {
          const event = groupEvents.find(e => e.id === selectedEventId);
          return { expenses: event?.expenses || [], isLocked: event?.isArchived || false, title: event?.name || 'Chi tiết đợt' };
      }
      return { expenses: [], isLocked: false, title: '' };
  }, [appMode, currentMonth, sessions, selectedEventId, groupEvents]);

  const currentExpenses = activeContextData.expenses;
  const isLocked = activeContextData.isLocked;

  const totalSpent = useMemo(() => {
    return currentExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [currentExpenses]);

  const processedExpenses = useMemo(() => {
      const data = [...currentExpenses];
      if (sortMode === 'price-desc') data.sort((a, b) => b.amount - a.amount);
      else if (sortMode === 'price-asc') data.sort((a, b) => a.amount - b.amount);
      else data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return data;
  }, [currentExpenses, sortMode]);

  const groupedExpenses = useMemo(() => {
      if (!isGrouped) return null;
      const groups: Record<string, Expense[]> = {};
      Object.keys(CATEGORIES).forEach(key => { groups[key] = []; });
      processedExpenses.forEach(item => {
          const key = item.category;
          if (groups[key]) groups[key].push(item);
          else { if (!groups['OTHER']) groups['OTHER'] = []; groups['OTHER'].push(item); }
      });
      return groups;
  }, [processedExpenses, isGrouped]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    currentExpenses.forEach(exp => {
      const catName = CATEGORIES[exp.category]?.label || 'Khác';
      const amt = exp.amount || 0;
      data[catName] = (data[catName] || 0) + amt;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [currentExpenses]);

  // --- Handlers ---
  const handleToggleLock = () => {
    if (appMode === 'personal') {
        setSessions(prev => ({ ...prev, [currentMonth]: { ...prev[currentMonth], isCompleted: !isLocked } }));
    } else if (appMode === 'group' && selectedEventId) {
        setGroupEvents(prev => prev.map(e => e.id === selectedEventId ? { ...e, isArchived: !e.isArchived } : e));
    }
  };

  const handleAddExpense = (expenseData: Omit<Expense, 'id'>) => {
    if (isLocked) return alert("Sổ đã khóa.");
    const newExpense: Expense = { ...expenseData, id: crypto.randomUUID() };
    if (appMode === 'personal') {
        setSessions(prev => {
            const session = prev[currentMonth] || { id: currentMonth, expenses: [] };
            return { ...prev, [currentMonth]: { ...session, expenses: [newExpense, ...session.expenses] } };
        });
    } else if (appMode === 'group' && selectedEventId) {
        setGroupEvents(prev => prev.map(e => e.id === selectedEventId ? { ...e, expenses: [newExpense, ...e.expenses] } : e));
    }
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    if (isLocked) return;
    if (appMode === 'personal') {
        setSessions(prev => {
            const newSessions = { ...prev };
            if (!editingExpense) return prev;
            const oldDate = new Date(editingExpense.date);
            const oldMonthKey = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}`;
            const newDate = new Date(updatedExpense.date);
            const newMonthKey = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
            if (newSessions[oldMonthKey]) newSessions[oldMonthKey].expenses = newSessions[oldMonthKey].expenses.filter(e => e.id !== updatedExpense.id);
            if (!newSessions[newMonthKey]) newSessions[newMonthKey] = { id: newMonthKey, expenses: [] };
            newSessions[newMonthKey].expenses = [...newSessions[newMonthKey].expenses, updatedExpense];
            return newSessions;
        });
    } else if (appMode === 'group' && selectedEventId) {
        setGroupEvents(prev => prev.map(e => e.id === selectedEventId ? { ...e, expenses: e.expenses.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp) } : e));
    }
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (isLocked) return;
    if(!window.confirm("Xóa khoản này?")) return;
    if (appMode === 'personal') {
        setSessions(prev => ({ ...prev, [currentMonth]: { ...prev[currentMonth], expenses: prev[currentMonth].expenses.filter(e => e.id !== id) } }));
    } else if (appMode === 'group' && selectedEventId) {
        setGroupEvents(prev => prev.map(e => e.id === selectedEventId ? { ...e, expenses: e.expenses.filter(exp => exp.id !== id) } : e));
    }
  };

  const handleCreateEvent = (eventData: Omit<GroupEvent, 'id' | 'expenses'>) => {
      const newEvent: GroupEvent = { ...eventData, id: crypto.randomUUID(), expenses: [] };
      setGroupEvents([newEvent, ...groupEvents]);
  };

  const handleChangeMonth = (direction: -1 | 1) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const handleAskGemini = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSpending(currentExpenses, totalSpent);
      setGeminiAnalysis(result);
    } catch (error) {
      console.error(error);
      setGeminiAnalysis({ message: "Mèo Mập chưa phân tích được. Thử lại sau nhé!", mood: 'neutral' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- IMPORT / EXPORT LOGIC ---
  const handleExportJSON = () => {
    if (appMode === 'personal') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
        const [year, month] = currentMonth.split('-');
        const fileName = `chi_tieu_ca_nhan_${month}_${year}.json`;
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } else if (appMode === 'group' && selectedEventId) {
        const event = groupEvents.find(e => e.id === selectedEventId);
        if (event) {
             const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(event, null, 2));
             const fileName = `chi_tieu_dot_${event.name}.json`;
             const downloadAnchorNode = document.createElement('a');
             downloadAnchorNode.setAttribute("href", dataStr);
             downloadAnchorNode.setAttribute("download", fileName);
             document.body.appendChild(downloadAnchorNode);
             downloadAnchorNode.click();
             downloadAnchorNode.remove();
        }
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let rawData: any = null;

        // Detect CSV vs JSON
        if (file.name.toLowerCase().endsWith('.csv')) {
             rawData = parseCSV(content);
        } else {
             try { rawData = JSON.parse(content); } 
             catch(jsonErr) { alert("File JSON lỗi."); return; }
        }

        if (appMode === 'personal') {
            const newSessions = { ...sessions };
            // Simple flatten normalization logic
            const list = Array.isArray(rawData) ? rawData : (rawData.data || rawData.Sheet1 || (rawData.items ? [rawData] : []));
            
            // If full backup structure check
            const isFullBackup = typeof rawData === 'object' && !Array.isArray(rawData) && Object.values(rawData).some((val: any) => val && Array.isArray(val.expenses));
            if (isFullBackup) {
                setSessions(prev => ({ ...prev, ...rawData }));
                // Attempt to find the most recent month key to display
                const keys = Object.keys(rawData).sort();
                if (keys.length > 0) setCurrentMonth(keys[keys.length - 1]);
                alert("Đã khôi phục dữ liệu backup thành công!");
                return;
            }

            // If flat list
            let count = 0;
            let lastImportedMonth = '';

            const items = Array.isArray(list) ? list : [];
            items.forEach((item: any) => {
                const processItem = (itm: any) => {
                    const norm = normalizeExpense(itm);
                    if (norm) {
                        const mKey = `${new Date(norm.date!).getFullYear()}-${String(new Date(norm.date!).getMonth() + 1).padStart(2, '0')}`;
                        
                        // Deep copy if not already (or initialize)
                        if (!newSessions[mKey]) {
                            newSessions[mKey] = { id: mKey, expenses: [] };
                        } else if (newSessions[mKey] === sessions[mKey]) {
                             // If it's still pointing to original state, shallow copy it first
                             newSessions[mKey] = { ...sessions[mKey], expenses: [...sessions[mKey].expenses] };
                        }

                        if (!newSessions[mKey].isCompleted) {
                            newSessions[mKey].expenses.push({ ...norm, id: crypto.randomUUID() } as Expense);
                            count++;
                            lastImportedMonth = mKey;
                        }
                    }
                };

                // Handle Hierarchical
                if (item.items && Array.isArray(item.items)) {
                    item.items.forEach(processItem);
                } else {
                    processItem(item);
                }
            });

            if (count > 0) {
                setSessions(newSessions);
                if (lastImportedMonth) setCurrentMonth(lastImportedMonth);
                alert(`Đã nhập thành công ${count} giao dịch!`);
            } else {
                alert("Không tìm thấy dữ liệu hợp lệ để nhập.");
            }

        } else if (appMode === 'group' && selectedEventId) {
             // Import into current event
             const list = Array.isArray(rawData) ? rawData : (rawData.data || []);
             let count = 0;
             setGroupEvents(prev => prev.map(evt => {
                 if (evt.id !== selectedEventId) return evt;
                 const newExpenses = [...evt.expenses];
                 list.forEach((item: any) => {
                     const norm = normalizeExpense(item);
                     if (norm) {
                         newExpenses.push({ ...norm, id: crypto.randomUUID() } as Expense);
                         count++;
                     }
                 });
                 return { ...evt, expenses: newExpenses };
             }));
             alert(`Đã thêm ${count} giao dịch vào đợt này.`);
        } else {
            alert("Vui lòng vào chi tiết một đợt (nếu là Nhóm) hoặc màn hình Cá nhân để nhập dữ liệu.");
        }

      } catch (err) {
        console.error(err);
        alert("Lỗi xử lý file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- RENDER ---
  if (appMode === 'selection') {
      return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-900 transition-colors duration-300 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cute-pink/30 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cute-blue/30 rounded-full blur-[100px]" />
            
            <div className="text-center mb-10 z-10">
                <div className="w-20 h-20 bg-gradient-to-tr from-cute-pink to-cute-purple rounded-3xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg rotate-6 hover:rotate-0 transition-all duration-500">
                    <Wallet size={40} />
                </div>
                <h1 className="text-4xl font-bold text-gray-700 dark:text-white mb-2">Mèo Mập Money</h1>
                <p className="text-gray-500 dark:text-gray-400">Chọn chế độ quản lý chi tiêu</p>
                <button onClick={toggleTheme} className="mt-4 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 text-gray-500 dark:text-yellow-400">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10">
                <button onClick={() => handleSelectMode('personal')} className="group relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-cute-pink dark:hover:border-cute-purple hover:shadow-xl transition-all duration-300 text-left">
                    <div className="w-14 h-14 bg-cute-green/30 text-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <User size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Cá nhân</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Quản lý ví tiền riêng của bạn. Tự do, thoải mái.</p>
                </button>

                <button onClick={() => handleSelectMode('group')} className="group relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-cute-yellow hover:shadow-xl transition-all duration-300 text-left">
                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">VIP</div>
                    <div className="w-14 h-14 bg-cute-yellow/50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Users size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Nhóm / Quỹ</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Quản lý các đợt đi chơi, quỹ nhóm, tiền nhà.</p>
                </button>
            </div>
            <p className="mt-12 text-xs text-gray-400 dark:text-gray-600">Dữ liệu được lưu riêng biệt cho từng chế độ</p>
        </div>
      );
  }

  if (appMode === 'group' && !selectedEventId) {
      const filteredEvents = groupEvents.filter(e => {
          const matchTab = groupTab === 'OWNER' ? e.role === 'OWNER' : e.role === 'MEMBER';
          const matchSearch = e.name.toLowerCase().includes(groupSearch.toLowerCase());
          return matchTab && matchSearch;
      });

      return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-900 transition-colors duration-300">
            <div className="max-w-5xl mx-auto px-4 pb-24 md:pb-10 font-sans">
                <Header 
                    currentMonth={currentMonth} 
                    onChangeMonth={() => {}}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    onImport={handleImportFile} // Support imported here? Maybe not necessary but ok
                    onExport={() => {}}
                    appMode="group"
                    onSwitchMode={handleSwitchMode}
                />

                <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 w-full md:w-auto">
                        <button onClick={() => setGroupTab('OWNER')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${groupTab === 'OWNER' ? 'bg-cute-yellow text-orange-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Tôi quản lý</button>
                        <button onClick={() => setGroupTab('MEMBER')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${groupTab === 'MEMBER' ? 'bg-cute-blue text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Tôi tham gia</button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="Tìm đợt chi tiêu..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-cute-yellow" />
                        </div>
                        <button onClick={() => setIsCreatingEvent(true)} className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:scale-105 transition-transform flex items-center gap-2 whitespace-nowrap"><Plus size={18} /> Tạo đợt</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.length > 0 ? (
                        filteredEvents.map(event => (
                            <div key={event.id} onClick={() => setSelectedEventId(event.id)} className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-cute-yellow transition-all group relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-2 h-full ${event.role === 'OWNER' ? 'bg-cute-yellow' : 'bg-cute-blue'}`} />
                                <div className="flex justify-between items-start mb-3 pl-4">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1">{event.name}</h3>
                                    {event.role === 'OWNER' && <Crown size={16} className="text-orange-400 shrink-0" />}
                                </div>
                                <div className="pl-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Calendar size={14} />{new Date(event.startDate).toLocaleDateString('vi-VN')}{event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('vi-VN')}`}</div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Users size={14} />{event.members.length} thành viên</div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-end pl-4">
                                    <div><span className="text-xs text-gray-400 block">Tổng chi</span><span className="font-bold text-gray-700 dark:text-white">{event.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('vi-VN')} đ</span></div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-400 group-hover:bg-cute-yellow group-hover:text-orange-700 transition-colors"><ArrowUpNarrowWide size={16} className="rotate-90" /></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center text-gray-400 dark:text-gray-500"><p className="text-4xl mb-3">🕸️</p><p>Không tìm thấy đợt chi tiêu nào.</p></div>
                    )}
                </div>

                {isCreatingEvent && <GroupEventModal onClose={() => setIsCreatingEvent(false)} onSave={handleCreateEvent} />}
            </div>
        </div>
      );
  }

  // LIST VIEW (Personal & Group Detail)
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 pb-24 md:pb-10 font-sans selection:bg-cute-pink selection:text-white">
        
        <Header 
            currentMonth={currentMonth} 
            onChangeMonth={handleChangeMonth} 
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            onImport={handleImportFile} // restored
            onExport={handleExportJSON} // restored
            appMode={appMode}
            onSwitchMode={handleSwitchMode}
            selectedEventName={appMode === 'group' ? activeContextData.title : undefined}
            onBackToGroupList={handleBackToGroupList}
        />

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={handleToggleLock} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${isLocked ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 hover:bg-green-200' : 'bg-white text-gray-500 hover:bg-gray-100 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700'}`}>
                        {isLocked ? <><CheckCircle size={16} /> Đã chốt sổ</> : <><Unlock size={16} /> Đang mở</>}
                    </button>
                    {appMode === 'group' && <span className="text-xs font-bold px-2 py-1 rounded bg-cute-yellow/20 text-orange-600">{groupEvents.find(e => e.id === selectedEventId)?.members.length} thành viên</span>}
                </div>
                
                <div className={`bg-gradient-to-br rounded-3xl p-8 text-white shadow-lg relative overflow-hidden transition-all duration-300 ${isLocked ? 'grayscale filter' : (appMode === 'group' ? 'from-orange-300 to-yellow-300 dark:from-orange-700 dark:to-yellow-800' : 'from-cute-pink to-pink-200 dark:from-pink-500 dark:to-purple-600')}`}>
                    {isLocked && <div className="absolute top-4 right-4 opacity-50"><Lock size={24} /></div>}
                    <div className="absolute -right-5 -top-5 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl"></div>
                    <p className="font-medium opacity-90 mb-1">{appMode === 'group' ? 'Tổng chi đợt này' : 'Tổng chi tháng này'}</p>
                    <h2 className="text-4xl font-bold tracking-tight">{totalSpent.toLocaleString('vi-VN')} <span className="text-xl">đ</span></h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3 relative transition-colors duration-300">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2"><span className="text-2xl bg-gray-100 dark:bg-slate-700 p-2 rounded-full">{isAnalyzing ? '🤔' : (geminiAnalysis.mood === 'happy' ? '😸' : geminiAnalysis.mood === 'concerned' ? '🙀' : '😽')}</span><h3 className="font-bold text-gray-700 dark:text-gray-200">Lời nhắn từ Mèo Mập</h3></div>
                        <button onClick={handleAskGemini} disabled={isAnalyzing || currentExpenses.length === 0} className="text-xs bg-gradient-to-r from-cute-blue to-blue-400 text-white px-3 py-1.5 rounded-full font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1 disabled:opacity-50"><Sparkles size={12} /> {isAnalyzing ? '...' : 'Phân tích'}</button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed italic bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl transition-colors">"{geminiAnalysis.message}"</p>
                </div>

                {chartData.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 h-80 flex flex-col transition-colors duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200">Biểu đồ</h3>
                            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
                                <button onClick={() => setChartType('pie')} className={`p-1.5 rounded-md ${chartType === 'pie' ? 'bg-white dark:bg-slate-600 shadow-sm text-cute-purple' : 'text-gray-400'}`}><PieChartIcon size={16} /></button>
                                <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 shadow-sm text-cute-purple' : 'text-gray-400'}`}><BarChart3 size={16} /></button>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'pie' ? (
                                <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => (value || 0).toLocaleString('vi-VN') + ' đ'} /></PieChart>
                            ) : (
                                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e5e7eb'} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} /><Tooltip formatter={(value: number) => (value || 0).toLocaleString('vi-VN') + ' đ'} cursor={{ fill: 'transparent' }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="lg:col-span-7">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2"><h3 className="font-bold text-xl text-gray-700 dark:text-gray-200 transition-colors">Lịch sử</h3>{isLocked && <Lock size={16} className="text-gray-400" />}</div>
                        <span className="text-sm text-gray-400 dark:text-gray-500">{currentExpenses.length} giao dịch</span>
                    </div>

                    {currentExpenses.length > 0 && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar">
                            <div className="flex gap-1 p-1 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <button onClick={() => setSortMode('date')} className={`p-1.5 rounded-md ${sortMode === 'date' ? 'bg-white shadow-sm text-cute-purple' : 'text-gray-400'}`}><CalendarDays size={18} /></button>
                                <button onClick={() => setSortMode('price-desc')} className={`p-1.5 rounded-md ${sortMode === 'price-desc' ? 'bg-white shadow-sm text-cute-purple' : 'text-gray-400'}`}><ArrowDownWideNarrow size={18} /></button>
                                <button onClick={() => setSortMode('price-asc')} className={`p-1.5 rounded-md ${sortMode === 'price-asc' ? 'bg-white shadow-sm text-cute-purple' : 'text-gray-400'}`}><ArrowUpNarrowWide size={18} /></button>
                            </div>
                            <div className="w-px h-6 bg-gray-200 mx-1"></div>
                            <button onClick={() => setIsGrouped(!isGrouped)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isGrouped ? 'bg-cute-purple text-white' : 'text-gray-500'}`}>{isGrouped ? <Layers size={16} /> : <ListFilter size={16} />} {isGrouped ? 'Đang gom' : 'Gom nhóm'}</button>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {currentExpenses.length === 0 ? (
                        <div className="text-center py-20 opacity-50 text-gray-400"><p className="mb-2 text-6xl">📝</p><p>Hãy thêm chi tiêu đầu tiên nhé!</p></div>
                    ) : (
                        isGrouped && groupedExpenses ? (
                            Object.keys(groupedExpenses).map(catKey => {
                                const list = groupedExpenses[catKey];
                                if (list.length === 0) return null;
                                const catInfo = CATEGORIES[catKey as CategoryType] || CATEGORIES[CategoryType.OTHER];
                                return (
                                    <div key={catKey} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-6">
                                        {/* Group Header */}
                                        <div className={`flex items-center justify-between p-4 ${catInfo.bgColor} bg-opacity-30 dark:bg-opacity-10 border-b border-gray-100 dark:border-slate-700`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white dark:bg-slate-800 shadow-sm ${catInfo.color}`}>{catInfo.icon}</div>
                                                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-lg">{catInfo.label}</h4>
                                            </div>
                                            <span className="font-bold text-gray-700 dark:text-white">{list.reduce((sum, item) => sum + item.amount, 0).toLocaleString('vi-VN')} đ</span>
                                        </div>
                                        
                                        {/* Group Items */}
                                        <div>
                                            {list.map(expense => {
                                                const date = new Date(expense.date);
                                                const day = date.getDate();
                                                const month = date.getMonth() + 1;
                                                return (
                                                    <SwipeableItem 
                                                        key={expense.id}
                                                        onEdit={() => setEditingExpense(expense)}
                                                        onDelete={() => handleDeleteExpense(expense.id)}
                                                        isLocked={isLocked || false}
                                                        className="border-b border-gray-50 dark:border-slate-700 last:border-0"
                                                    >
                                                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                                            <div className="flex items-center gap-4 overflow-hidden">
                                                                {/* Date Badge */}
                                                                <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-700/50 rounded-lg py-1">
                                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{day}</span>
                                                                    <span className="text-[10px] text-gray-400">T{month}</span>
                                                                </div>
                                                                {/* Content */}
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-gray-700 dark:text-gray-200 truncate">{expense.note}</p>
                                                                </div>
                                                            </div>
                                                            {/* Amount & Actions */}
                                                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                                                <span className="font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">-{expense.amount.toLocaleString('vi-VN')} đ</span>
                                                                {!isLocked && (
                                                                    <div className="hidden md:flex gap-1">
                                                                        <button onClick={(e) => {e.stopPropagation(); setEditingExpense(expense)}} className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 rounded"><Edit2 size={14} /></button>
                                                                        <button onClick={(e) => {e.stopPropagation(); handleDeleteExpense(expense.id)}} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </SwipeableItem>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            processedExpenses.map(expense => {
                                const cat = CATEGORIES[expense.category] || CATEGORIES[CategoryType.OTHER];
                                return (
                                    <SwipeableItem 
                                        key={expense.id}
                                        onEdit={() => setEditingExpense(expense)}
                                        onDelete={() => handleDeleteExpense(expense.id)}
                                        isLocked={isLocked || false}
                                        className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-50 dark:border-slate-700 mb-2"
                                    >
                                        <div className="flex items-center justify-between p-4 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                                <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl md:text-2xl ${cat.bgColor}`}>{cat.icon}</div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-700 dark:text-gray-200 truncate">{cat.label}</p>
                                                    <p className="text-xs md:text-sm text-gray-400 truncate">{expense.note} • {new Date(expense.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 md:gap-4 ml-2 shrink-0">
                                                <span className="font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap text-sm md:text-base">-{ (expense.amount || 0).toLocaleString('vi-VN') } đ</span>
                                                {!isLocked && (
                                                    <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => {e.stopPropagation(); setEditingExpense(expense)}} className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 rounded"><Edit2 size={16} /></button>
                                                        <button onClick={(e) => {e.stopPropagation(); handleDeleteExpense(expense.id)}} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded"><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </SwipeableItem>
                                );
                            })
                        )
                    )}
                </div>
            </div>
        </main>

        <ExpenseForm 
            onAdd={handleAddExpense} 
            isLocked={isLocked} 
            currentMonth={currentMonth} 
            editingExpense={editingExpense}
            onUpdate={handleUpdateExpense}
            onClose={() => setEditingExpense(null)}
        />
        </div>
    </div>
  );
};

export default App;