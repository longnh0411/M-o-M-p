import { CategoryType, Expense } from '../types';
import { CATEGORIES } from '../constants';

// Helper to parse CSV line keeping quotes in mind
const parseCSVLine = (text: string) => {
  const re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
  const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,|$))/g;

  if (!re_valid.test(text)) return null;

  const a = [];
  text.replace(re_value, function(m0, m1, m2, m3) {
      if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
      else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
      else if (m3 !== undefined) a.push(m3);
      return '';
  });
  if (/,\s*$/.test(text)) a.push('');
  return a;
};

// Helper to find CategoryType from Vietnamese label or English key
const mapCategory = (input: string): CategoryType => {
  const normalizedInput = input.trim().toLowerCase();
  
  // Check exact keys first
  if (Object.keys(CATEGORIES).includes(input.toUpperCase())) {
      return input.toUpperCase() as CategoryType;
  }

  // Check labels (Vietnamese)
  const found = Object.values(CATEGORIES).find(cat => 
    cat.label.toLowerCase() === normalizedInput || 
    normalizedInput.includes(cat.label.toLowerCase())
  );

  return found ? found.id : CategoryType.OTHER;
};

// Helper to parse various date formats
const parseDate = (dateStr: string): string => {
  try {
    // Try standard constructor
    let date = new Date(dateStr);
    
    // Check if Invalid Date
    if (isNaN(date.getTime())) {
        // Handle DD/MM/YYYY format common in Vietnam
        const parts = dateStr.split(/[/-]/);
        if (parts.length === 3) {
            // Assume Day-Month-Year
            date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }
  } catch (e) {
      console.warn("Date parse error", dateStr);
  }
  return new Date().toISOString(); // Fallback to now
};

export const fetchExpensesFromSheet = async (sheetId: string): Promise<Expense[]> => {
  // Use Google Viz API for better CSV export (handles CORS better than /export)
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch sheet. Ensure "Anyone with the link" is set to Viewer.');
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    const expenses: Expense[] = [];

    // Skip header (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        if (!cols || cols.length < 2) continue;

        // Assumed Columns: 
        // 0: Date (Ngày)
        // 1: Amount (Số tiền)
        // 2: Category (Danh mục)
        // 3: Note (Ghi chú)

        const dateStr = cols[0]?.replace(/"/g, '') || '';
        // Robust amount cleaning: remove invalid chars but keep numbers
        const amountStr = cols[1]?.replace(/[^\d]/g, '') || '0'; 
        const catStr = cols[2]?.replace(/"/g, '') || '';
        const noteStr = cols[3]?.replace(/"/g, '') || '';

        // Safe Parsing
        let amountVal = parseFloat(amountStr);
        if (isNaN(amountVal)) amountVal = 0;

        if (amountVal === 0) continue;

        expenses.push({
            id: `sheet-${i}-${Date.now()}`, // Generate temporary ID
            date: parseDate(dateStr),
            amount: amountVal,
            category: mapCategory(catStr),
            note: noteStr || mapCategory(catStr)
        });
    }

    return expenses;

  } catch (error) {
    console.error("Sheet Sync Error:", error);
    throw error;
  }
};