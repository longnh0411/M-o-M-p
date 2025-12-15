import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { CategoryType, Expense } from '../types';
import { CATEGORIES } from '../constants';

interface ExpenseFormProps {
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  isLocked?: boolean;
  currentMonth: string; // Format "YYYY-MM"
  editingExpense?: Expense | null;
  onUpdate?: (expense: Expense) => void;
  onClose?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ 
    onAdd, 
    isLocked, 
    currentMonth, 
    editingExpense, 
    onUpdate, 
    onClose 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<CategoryType>(CategoryType.FOOD);
  const [selectedDate, setSelectedDate] = useState('');

  // Calculate constraints based on currentMonth
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  
  const minDate = `${yearStr}-${monthStr}-01`;
  const maxDate = `${yearStr}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;

  // Handle Edit Mode: Open form and populate fields when editingExpense changes
  useEffect(() => {
    if (editingExpense) {
        setIsOpen(true);
        setAmount(editingExpense.amount.toString());
        setNote(editingExpense.note);
        setCategory(editingExpense.category);
        
        // Convert ISO string to YYYY-MM-DD for input[type=date]
        const dateObj = new Date(editingExpense.date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [editingExpense]);

  // Initialize/Reset date when the form opens fresh (Add Mode)
  useEffect(() => {
    if (isOpen && !editingExpense) {
        const today = new Date();
        const isCurrentRealMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
        
        if (isCurrentRealMonth) {
            setSelectedDate(today.toISOString().split('T')[0]);
        } else {
            setSelectedDate(minDate);
        }
    }
  }, [isOpen, editingExpense, currentMonth, minDate, year, month]);

  const handleClose = () => {
      setIsOpen(false);
      // Reset form
      setAmount('');
      setNote('');
      setCategory(CategoryType.FOOD);
      if (onClose) onClose(); // Clear editing state in parent
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    // Preserve time if editing, else use current time
    const dateObj = new Date(selectedDate);
    const now = new Date();
    
    // If editing, try to keep original time, otherwise use current time
    if (editingExpense) {
        const oldDate = new Date(editingExpense.date);
        dateObj.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
    } else {
        dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    if (editingExpense && onUpdate) {
        // UPDATE MODE
        onUpdate({
            ...editingExpense,
            amount: parseFloat(amount),
            note: note || CATEGORIES[category].label,
            category,
            date: dateObj.toISOString()
        });
    } else {
        // ADD MODE
        onAdd({
            amount: parseFloat(amount),
            note: note || CATEGORIES[category].label,
            category,
            date: dateObj.toISOString(),
        });
    }

    handleClose();
  };

  // Nếu đã khóa sổ (isLocked = true), không hiển thị nút thêm
  if (isLocked) {
    return null;
  }

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
          <h3 className="text-xl font-bold text-gray-700 dark:text-white">
            {editingExpense ? 'Sửa khoản chi ✏️' : 'Thêm khoản chi mới 💸'}
          </h3>
          <button 
            onClick={handleClose}
            className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Số tiền (VND)</label>
                <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-2xl font-bold text-cute-purple placeholder-gray-200 dark:placeholder-slate-600 bg-transparent border-none focus:ring-0 p-0"
                placeholder="0"
                autoFocus={!editingExpense} // Autofocus only on new entry
                required
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Calendar size={14} /> Ngày
                </label>
                <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    // Only constrain min/max if NOT editing. 
                    // If editing, we allow the original date to be shown, 
                    // BUT if user changes it to another month, logic in App.tsx handles the move.
                    // For UX simplicity, we can keep constraints or relax them. 
                    // Let's relax constraints slightly if editing to ensure the current date is visible.
                    required
                    className="w-full bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-white rounded-xl p-2 text-sm border-none focus:ring-1 focus:ring-cute-pink"
                />
             </div>
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
            {editingExpense ? 'Cập nhật' : 'Lưu ngay'}
          </button>
        </form>
      </div>
    </div>
  );
};