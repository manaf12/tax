import type { Request } from 'express';
export declare class CsrfController {
    getCsrfToken(req: Request): {
        csrfToken: string;
    };
}
