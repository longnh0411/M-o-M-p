import React, { useState } from 'react';
import { X, Calendar, UserPlus, Trash2, Crown, User } from 'lucide-react';
import { GroupEvent, GroupRole } from '../types';

interface GroupEventModalProps {
  onClose: () => void;
  onSave: (event: Omit<GroupEvent, 'id' | 'expenses'>) => void;
}

export const GroupEventModal: React.FC<GroupEventModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [role, setRole] = useState<GroupRole>('OWNER');
  
  // Members State
  const [members, setMembers] = useState<{name: string, id: string}[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setMembers([...members, { id: crypto.randomUUID(), name: newMemberName.trim() }]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    // Auto-add yourself if owner
    let finalMembers = [...members];
    if (role === 'OWNER' && !finalMembers.some(m => m.name.toLowerCase() === 'tôi' || m.name.toLowerCase() === 'me')) {
        // Optional: you can force add "Me" or leave it to user
    }

    onSave({
        name,
        startDate,
        endDate: endDate || undefined,
        role,
        members: finalMembers,
        isArchived: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-700 dark:text-white flex items-center gap-2">
             Tạo đợt chi tiêu mới ✨
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
            <X size={20} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-5 pr-2 no-scrollbar">
            {/* 1. Basic Info */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400">Thông tin đợt</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vd: Đi chơi Đầm Sen, Tiền nhà tháng 10..."
                    className="w-full p-3 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cute-yellow placeholder-gray-400 dark:placeholder-slate-500 transition-colors text-lg font-semibold"
                    autoFocus
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Từ ngày</label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-white rounded-xl p-2 text-sm border-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Đến ngày (Tùy chọn)</label>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="w-full bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-white rounded-xl p-2 text-sm border-none"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Role Selection */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400">Vai trò của bạn</label>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setRole('OWNER')}
                        className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${role === 'OWNER' ? 'border-cute-yellow bg-yellow-50 dark:bg-yellow-900/20 text-orange-600' : 'border-transparent bg-gray-50 dark:bg-slate-700 text-gray-500'}`}
                    >
                        <Crown size={18} />
                        <span className="font-bold text-sm">Tôi quản lý</span>
                    </button>
                    <button 
                        onClick={() => setRole('MEMBER')}
                        className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${role === 'MEMBER' ? 'border-cute-blue bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-transparent bg-gray-50 dark:bg-slate-700 text-gray-500'}`}
                    >
                        <User size={18} />
                        <span className="font-bold text-sm">Tôi là thành viên</span>
                    </button>
                </div>
            </div>

            {/* 3. Members Management */}
            {role === 'OWNER' && (
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400">Thành viên tham gia ({members.length})</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddMember(e)}
                            placeholder="Nhập tên thành viên..."
                            className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cute-yellow"
                        />
                        <button 
                            onClick={handleAddMember}
                            disabled={!newMemberName.trim()}
                            className="bg-cute-yellow text-orange-700 px-3 rounded-xl hover:brightness-95 disabled:opacity-50"
                        >
                            <UserPlus size={20} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                        {members.length === 0 && <span className="text-xs text-gray-400 italic">Chưa có thành viên nào.</span>}
                        {members.map(m => (
                            <div key={m.id} className="flex items-center gap-1 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 px-3 py-1 rounded-full text-sm text-gray-700 dark:text-white">
                                {m.name}
                                <button onClick={() => handleRemoveMember(m.id)} className="text-gray-400 hover:text-red-500 ml-1">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <button
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all mt-6"
        >
            Hoàn tất tạo đợt
        </button>
      </div>
    </div>
  );
};