import { create } from 'zustand';

/**
 * 校验结果共享存储
 * 用于在不同组件之间共享校验结果，确保Inspector和Editor使用同一数据源
 */
interface ValidationState {
  // Character校验结果
  characterValidation: {
    entityId: string;
    errors: { type: 'error' | 'warning'; field: string; message: string }[];
    passed: boolean;
    timestamp: number;
  } | null;
  
  setCharacterValidation: (entityId: string, errors: { type: 'error' | 'warning'; field: string; message: string }[], passed: boolean) => void;
  clearCharacterValidation: () => void;
}

export const useValidationStore = create<ValidationState>((set) => ({
  characterValidation: null,
  
  setCharacterValidation: (entityId, errors, passed) => set({
    characterValidation: {
      entityId,
      errors,
      passed,
      timestamp: Date.now()
    }
  }),
  
  clearCharacterValidation: () => set({ characterValidation: null }),
}));
