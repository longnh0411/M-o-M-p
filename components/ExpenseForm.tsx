import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CategoryType, Expense } from '../types';
import { CATEGORIES } from '../constants';

interface ExpenseFormProps {
  onAdd: (expense: Omit<Expense, 'id'>) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<CategoryType>(CategoryType.FOOD);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    onAdd({
      amount: parseFloat(amount),
      note: note || CATEGORIES[category].label,
      category,
      date: new Date().toISOString(),
    });

    // Reset
    setAmount('');
    setNote('');
    setCategory(CategoryType.FOOD);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-gradient-to-tr from-cute-purple to-cute-pink rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 z-50"
      >
        <Plus size={32} strokeWidth={3} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-700 dark:text-white">Thêm khoản chi mới 💸</h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Số tiền (VND)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-3xl font-bold text-cute-purple placeholder-gray-200 dark:placeholder-slate-600 bg-transparent border-none focus:ring-0 p-0"
              placeholder="0"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Danh mục</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                    category === cat.id
                      ? `border-cute-purple ${cat.bgColor} dark:bg-opacity-80`
                      : 'border-transparent bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <span className="text-xl mb-1">{cat.icon}</span>
                  <span className={`text-xs font-medium ${category === cat.id ? 'text-gray-700' : 'text-gray-600 dark:text-gray-300'}`}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ghi chú (tùy chọn)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cute-pink placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
              placeholder="Vd: Mua trà sữa..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-cute-purple text-white font-bold rounded-2xl shadow-md hover:bg-opacity-90 active:scale-95 transition-all mt-4"
          >
            Lưu ngay
          </button>
        </form>
      </div>
    </div>
  );
};