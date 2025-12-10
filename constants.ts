import { CategoryType, CategoryInfo } from './types';

export const CATEGORIES: Record<CategoryType, CategoryInfo> = {
  [CategoryType.FOOD]: {
    id: CategoryType.FOOD,
    label: 'Ăn uống',
    icon: '🍜',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100'
  },
  [CategoryType.COFFEE]: {
    id: CategoryType.COFFEE,
    label: 'Cà phê',
    icon: '☕',
    color: 'text-brown-600',
    bgColor: 'bg-amber-100'
  },
  [CategoryType.HOUSING]: {
    id: CategoryType.HOUSING,
    label: 'Nhà ở',
    icon: '🏠',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100'
  },
  [CategoryType.SHOPPING]: {
    id: CategoryType.SHOPPING,
    label: 'Mua sắm',
    icon: '🛍️',
    color: 'text-pink-500',
    bgColor: 'bg-pink-100'
  },
  [CategoryType.TRANSPORT]: {
    id: CategoryType.TRANSPORT,
    label: 'Đi lại',
    icon: '🛵',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100'
  },
  [CategoryType.OTHER]: {
    id: CategoryType.OTHER,
    label: 'Khác',
    icon: '✨',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100'
  }
};

export const CHART_COLORS = ['#FFC8DD', '#BDE0FE', '#FFEF96', '#CDB4DB', '#A2D2FF', '#FFD6A5'];

export const INITIAL_ADVICE = "Chào bạn! Mình là Mèo Mập. Hãy thêm chi tiêu để mình giúp bạn quản lý nhé!";
