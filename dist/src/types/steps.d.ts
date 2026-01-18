export declare enum StepStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    DONE = "DONE",
    CANCELED = "CANCELED"
}
export interface Step {
    id: string;
    order: number;
    nameKey?: string;
    name?: string;
    status: StepStatus;
    updatedAt?: string;
    updatedBy?: string;
    meta?: Record<string, any>;
}
