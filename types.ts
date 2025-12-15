export enum CategoryType {
  FOOD = 'FOOD',
  HOUSING = 'HOUSING',
  COFFEE = 'COFFEE',
  SHOPPING = 'SHOPPING',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER'
}

export interface Expense {
  id: string;
  amount: number;
  note: string;
  category: CategoryType;
  date: string; // ISO string
}

export interface MonthlySession {
  id: string; // Format "YYYY-MM"
  expenses: Expense[];
  budget?: number;
  isCompleted?: boolean; // Trạng thái khóa sổ
}

export interface CategoryInfo {
  id: CategoryType;
  label: string;
  icon: string; // Emoji
  color: string;
  bgColor: string;
}

export interface GeminiAnalysis {
  message: string;
  mood: 'happy' | 'concerned' | 'neutral';
}

// --- Group / Fund Types ---

export type GroupRole = 'OWNER' | 'MEMBER';

export interface GroupMember {
  id: string;
  name: string;
}

export interface GroupEvent {
  id: string;
  name: string; // Tên đợt (Vd: Đi chơi Đầm Sen)
  startDate: string; // ISO Date
  endDate?: string; // ISO Date (Optional)
  role: GroupRole; // Tôi quản lý hay tôi là thành viên
  members: GroupMember[];
  expenses: Expense[];
  isArchived?: boolean; // Đã kết thúc/quyết toán
}