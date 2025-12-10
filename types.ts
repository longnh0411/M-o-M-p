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
