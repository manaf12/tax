// types/step.ts
export enum StepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
}

export interface Step {
  id: string; // مثال: 'documentsPreparation'
  order: number; // 1..5
  nameKey?: string; // مثال: 'steps.documentsPreparation' (i18n)
  name?: string; // أو اسم نصي مباشر
  status: StepStatus;
  updatedAt?: string; // ISO string
  updatedBy?: string; // userId
  meta?: Record<string, any>;
}
