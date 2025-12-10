import { GoogleGenAI } from "@google/genai";
import { Expense, CategoryType, GeminiAnalysis } from '../types';
import { CATEGORIES } from '../constants';

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeSpending = async (
  expenses: Expense[],
  totalSpent: number
): Promise<GeminiAnalysis> => {
  const ai = getGeminiClient();
  
  if (!ai) {
    return {
      message: "Vui lòng nhập API Key để Mèo Mập có thể tư vấn nha! (Giả lập: Bạn đang tiêu xài khá ổn đó!)",
      mood: 'neutral'
    };
  }

  // Summarize data for the prompt
  const breakdown = expenses.reduce((acc, curr) => {
    const catName = CATEGORIES[curr.category].label;
    acc[catName] = (acc[catName] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const prompt = `
    Bạn là một trợ lý tài chính tên là "Mèo Mập". Tính cách: Dễ thương, hài hước, đôi khi hơi đanh đá nếu tiêu xài hoang phí, nhưng luôn quan tâm.
    
    Hãy phân tích dữ liệu chi tiêu sau đây trong tháng này:
    - Tổng chi: ${totalSpent.toLocaleString('vi-VN')} VND
    - Chi tiết: ${JSON.stringify(breakdown)}
    
    Yêu cầu:
    1. Đưa ra một nhận xét ngắn gọn (tối đa 2 câu) bằng tiếng Việt.
    2. Xác định tâm trạng của bạn dựa trên cách chi tiêu (happy, concerned, neutral).
    3. Trả về định dạng JSON thuần không có markdown block.
    
    Ví dụ output:
    { "message": "Meow! Tháng này bạn uống trà sữa hơi nhiều nha, coi chừng béo đó!", "mood": "concerned" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text) as GeminiAnalysis;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      message: "Meow... Mạng đang chập chờn, mình chưa phân tích được. Thử lại sau nhé!",
      mood: 'neutral'
    };
  }
};
