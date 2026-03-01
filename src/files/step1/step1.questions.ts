// src/files/step1/step1.questions.ts
export type Step1Type = 'text' | 'number' | 'select';

export type Step1Question = {
  id: string;
  labelKey: string;
  type: Step1Type;
  required: boolean;
  sectionKey: string;
  options?: { value: string; labelKey: string }[];
  min?: number;
  max?: number;
  spouseQuestion?: boolean; // ← new: marks this as a spouse-only question
};

export const STEP1_QUESTIONS: Step1Question[] = [
  {
    id: 'personalChanges',
    labelKey: 'step1.questions.personalChanges',
    type: 'text',
    required: false,
    sectionKey: 'step1.sections.personalInformation',
  },

  // ── Primary person ───────────────────────────────────────────
  {
    id: 'transportMode',
    labelKey: 'step1.questions.transportMode',
    type: 'select',
    required: true,
    sectionKey: 'step1.sections.professionalExpenses',
    options: [
      {
        value: 'publicTransport',
        labelKey: 'step1.options.transportMode.publicTransport',
      },
      { value: 'bicycle', labelKey: 'step1.options.transportMode.bicycle' },
      { value: 'vehicle', labelKey: 'step1.options.transportMode.vehicle' },
    ],
  },
  {
    id: 'distanceToWorkKm',
    labelKey: 'step1.questions.distanceToWorkKm',
    type: 'number',
    required: true,
    sectionKey: 'step1.sections.professionalExpenses',
    min: 0,
  },
  {
    id: 'weeklyTripsToWork',
    labelKey: 'step1.questions.weeklyTripsToWork',
    type: 'number',
    required: true,
    sectionKey: 'step1.sections.professionalExpenses',
    min: 0,
  },
  {
    id: 'mealsOutsidePerWeek',
    labelKey: 'step1.questions.mealsOutsidePerWeek',
    type: 'number',
    required: true,
    sectionKey: 'step1.sections.professionalExpenses',
    min: 0,
  },

  // ── Spouse (shown only if married) ───────────────────────────
  {
    id: 'spouse_transportMode',
    labelKey: 'step1.questions.spouse_transportMode',
    type: 'select',
    required: false, // optional because spouse may not work
    spouseQuestion: true,
    sectionKey: 'step1.sections.spouseProfessionalExpenses',
    options: [
      {
        value: 'publicTransport',
        labelKey: 'step1.options.transportMode.publicTransport',
      },
      { value: 'bicycle', labelKey: 'step1.options.transportMode.bicycle' },
      { value: 'vehicle', labelKey: 'step1.options.transportMode.vehicle' },
    ],
  },
  {
    id: 'spouse_distanceToWorkKm',
    labelKey: 'step1.questions.spouse_distanceToWorkKm',
    type: 'number',
    required: false,
    spouseQuestion: true,
    sectionKey: 'step1.sections.spouseProfessionalExpenses',
    min: 0,
  },
  {
    id: 'spouse_weeklyTripsToWork',
    labelKey: 'step1.questions.spouse_weeklyTripsToWork',
    type: 'number',
    required: false,
    spouseQuestion: true,
    sectionKey: 'step1.sections.spouseProfessionalExpenses',
    min: 0,
  },
  {
    id: 'spouse_mealsOutsidePerWeek',
    labelKey: 'step1.questions.spouse_mealsOutsidePerWeek',
    type: 'number',
    required: false,
    spouseQuestion: true,
    sectionKey: 'step1.sections.spouseProfessionalExpenses',
    min: 0,
  },

  // ── Rest unchanged ────────────────────────────────────────────
  {
    id: 'netAnnualRentVD_GE',
    labelKey: 'step1.questions.netAnnualRentVD_GE',
    type: 'number',
    required: false,
    sectionKey: 'step1.sections.housing',
    min: 0,
  },
  {
    id: 'canton',
    labelKey: 'step1.questions.canton',
    type: 'select',
    required: true,
    sectionKey: 'step1.sections.taxAuthorityNumbers',
    options: [
      { value: 'FR', labelKey: 'step1.options.canton.FR' },
      { value: 'BE', labelKey: 'step1.options.canton.BE' },
      { value: 'VD', labelKey: 'step1.options.canton.VD' },
      { value: 'VS', labelKey: 'step1.options.canton.VS' },
      { value: 'NE', labelKey: 'step1.options.canton.NE' },
      { value: 'GE', labelKey: 'step1.options.canton.GE' },
      { value: 'OTHER', labelKey: 'step1.options.canton.OTHER' },
    ],
  },
  {
    id: 'taxpayerNumber',
    labelKey: 'step1.questions.taxpayerNumber',
    type: 'text',
    required: true,
    sectionKey: 'step1.sections.taxAuthorityNumbers',
  },
  {
    id: 'controlOrDeclarationCode',
    labelKey: 'step1.questions.controlOrDeclarationCode',
    type: 'text',
    required: false,
    sectionKey: 'step1.sections.taxAuthorityNumbers',
  },
];
