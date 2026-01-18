export declare function generateRandomHex(bytes?: number): string;
export declare function composeToken(id: string, raw: string): string;
export declare function parseCompositeToken(composite: string): {
    id: string;
    raw: string;
} | null;
