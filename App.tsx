import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trash2, Sparkles } from 'lucide-react';

// Local Components & Services
import { Header } from './components/Header';
import { ExpenseForm } from './components/ExpenseForm';
import { analyzeSpending } from './services/geminiService';
import { Expense, MonthlySession, GeminiAnalysis } from './types';
import { CATEGORIES, CHART_COLORS, INITIAL_ADVICE } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [sessions, setSessions] = useState<Record<string, MonthlySession>>({});
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis>({ 
    message: INITIAL_ADVICE, 
    mood: 'happy' 
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Theme State ---
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
    const saved = localStorage.getItem('meoMapSessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (Object.keys(sessions).length > 0) {
      localStorage.setItem('meoMapSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Handle Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- Computed Data ---
  const currentExpenses = useMemo(() => {
    return sessions[currentMonth]?.expenses || [];
  }, [sessions, currentMonth]);

  const totalSpent = useMemo(() => {
    return currentExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [currentExpenses]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    currentExpenses.forEach(exp => {
      const catName = CATEGORIES[exp.category].label;
      data[catName] = (data[catName] || 0) + exp.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [currentExpenses]);

  // --- Handlers ---
  const handleAddExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
    };

    setSessions(prev => {
      const session = prev[currentMonth] || { id: currentMonth, expenses: [] };
      return {
        ...prev,
        [currentMonth]: {
          ...session,
          expenses: [newExpense, ...session.expenses] // Add to top
        }
      };
    });
  };

  const handleDeleteExpense = (id: string) => {
    if(!window.confirm("Bạn có chắc muốn xóa khoản này không?")) return;
    setSessions(prev => ({
      ...prev,
      [currentMonth]: {
        ...prev[currentMonth],
        expenses: prev[currentMonth].expenses.filter(e => e.id !== id)
      }
    }));
  };

  const handleChangeMonth = (direction: -1 | 1) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleAskGemini = async () => {
    if (currentExpenses.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeSpending(currentExpenses, totalSpent);
    setGeminiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 pb-24 md:pb-10 font-sans selection:bg-cute-pink selection:text-white">
        
        <Header 
            currentMonth={currentMonth} 
            onChangeMonth={handleChangeMonth} 
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
        />

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Stats & Summary */}
            <div className="lg:col-span-5 space-y-6">
            
            {/* Total Card */}
            <div className="bg-gradient-to-br from-cute-pink to-pink-200 dark:from-pink-500 dark:to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden transition-all duration-300">
                <div className="absolute -right-5 -top-5 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl"></div>
                <p className="font-medium opacity-90 mb-1">Tổng chi tiêu tháng này</p>
                <h2 className="text-4xl font-bold tracking-tight">
                {totalSpent.toLocaleString('vi-VN')} <span className="text-xl">đ</span>
                </h2>
            </div>

            {/* Gemini Analysis Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3 relative transition-colors duration-300">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl bg-gray-100 dark:bg-slate-700 p-2 rounded-full">
                            {isAnalyzing ? '🤔' : (geminiAnalysis.mood === 'happy' ? '😸' : geminiAnalysis.mood === 'concerned' ? '🙀' : '😽')}
                        </span>
                        <h3 className="font-bold text-gray-700 dark:text-gray-200">Lời nhắn từ Mèo Mập</h3>
                    </div>
                    <button 
                        onClick={handleAskGemini}
                        disabled={isAnalyzing || currentExpenses.length === 0}
                        className="text-xs bg-gradient-to-r from-cute-blue to-blue-400 text-white px-3 py-1.5 rounded-full font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                        <Sparkles size={12} />
                        {isAnalyzing ? 'Đang nghĩ...' : 'Phân tích'}
                    </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed italic bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl transition-colors">
                "{geminiAnalysis.message}"
                </p>
            </div>

            {/* Chart Section - Only show if data exists */}
            {chartData.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 h-80 flex flex-col items-center justify-center transition-colors duration-300">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 self-start mb-2">Biểu đồ chi tiêu</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'}
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                            color: isDarkMode ? '#fff' : '#333'
                        }}
                        itemStyle={{ color: isDarkMode ? '#e2e8f0' : '#333' }}
                    />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {chartData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                            {entry.name}
                        </div>
                    ))}
                </div>
                </div>
            ) : (
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl p-8 border border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2 transition-colors">
                    <span className="text-4xl">🌵</span>
                    <p>Chưa có dữ liệu tháng này</p>
                </div>
            )}
            </div>

            {/* Right Column: Transaction List */}
            <div className="lg:col-span-7">
            <div className="flex justify-between items-end mb-4 px-2">
                <h3 className="font-bold text-xl text-gray-700 dark:text-gray-200 transition-colors">Lịch sử giao dịch</h3>
                <span className="text-sm text-gray-400 dark:text-gray-500">{currentExpenses.length} giao dịch</span>
            </div>

            <div className="space-y-3">
                {currentExpenses.length === 0 ? (
                    <div className="text-center py-20 opacity-50 text-gray-400 dark:text-gray-500">
                        <p className="mb-2 text-6xl">📝</p>
                        <p>Hãy thêm chi tiêu đầu tiên nhé!</p>
                    </div>
                ) : (
                    currentExpenses.map((expense) => {
                        const cat = CATEGORIES[expense.category];
                        return (
                            <div key={expense.id} className="group bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${cat.bgColor} dark:bg-opacity-20`}>
                                        {cat.icon}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-700 dark:text-gray-200">{cat.label}</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">
                                            {expense.note} • {new Date(expense.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-gray-700 dark:text-gray-200 block">
                                        -{expense.amount.toLocaleString('vi-VN')} đ
                                    </span>
                                    <button 
                                        onClick={() => handleDeleteExpense(expense.id)}
                                        className="text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            </div>

        </main>

        <ExpenseForm onAdd={handleAddExpense} />
        </div>
    </div>
  );
};

export default App;