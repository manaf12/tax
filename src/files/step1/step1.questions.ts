// src/files/step1/step1.questions.ts
export type Step1Type = 'text' | 'number' | 'select';

export type Step1Question = {
  id: string;
  label: string;
  type: Step1Type;
  required: boolean;
  section: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
};

export const STEP1_QUESTIONS: Step1Question[] = [
  {
    id: 'personalChanges',
    label:
      'Notification of any changes vs previous year (address, marital status, children, assets, etc.)',
    type: 'text',
    required: false,
    section: 'Personal Information',
  },

  {
    id: 'transportMode',
    label: 'Transport mode',
    type: 'select',
    required: true,
    section: 'Professional Expenses',
    options: [
      { value: 'publicTransport', label: 'Public transport' },
      { value: 'bicycle', label: 'Bicycle' },
      { value: 'vehicle', label: 'Vehicle (car/motorcycle)' },
    ],
  },
  {
    id: 'distanceToWorkKm',
    label: 'Distance to work (km)',
    type: 'number',
    required: true,
    section: 'Professional Expenses',
    min: 0,
  },
  {
    id: 'weeklyTripsToWork',
    label: 'Number of weekly trips',
    type: 'number',
    required: true,
    section: 'Professional Expenses',
    min: 0,
  },
  {
    id: 'mealsOutsidePerWeek',
    label: 'Meals per week taken outside home',
    type: 'number',
    required: true,
    section: 'Professional Expenses',
    min: 0,
  },

  {
    id: 'netAnnualRentVD_GE',
    label: 'Net annual rent (VD + GE only)',
    type: 'number',
    required: false, // later make conditional
    section: 'Housing',
    min: 0,
  },

  {
    id: 'canton',
    label: 'Canton',
    type: 'select',
    required: true,
    section: 'Tax Authority Numbers',
    options: [
      { value: 'FR', label: 'Fribourg (FR)' },
      { value: 'BE', label: 'Bern (BE)' },
      { value: 'VD', label: 'Vaud (VD)' },
      { value: 'VS', label: 'Valais (VS)' },
      { value: 'NE', label: 'Neuchâtel (NE)' },
      { value: 'GE', label: 'Geneva (GE)' },
      { value: 'OTHER', label: 'Other' },
    ],
  },
  {
    id: 'taxpayerNumber',
    label: 'Taxpayer number',
    type: 'text',
    required: true,
    section: 'Tax Authority Numbers',
  },
  {
    id: 'controlOrDeclarationCode',
    label: 'Control code / Declaration code / Code (if applicable)',
    type: 'text',
    required: false,
    section: 'Tax Authority Numbers',
  },
];
