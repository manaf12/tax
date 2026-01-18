import { TaxFilingService } from './tax-filing.service';
import { TaxFiling } from './tax-filing.entity';
export declare class TaxFilingController {
    private readonly taxFilingService;
    constructor(taxFilingService: TaxFilingService);
    startFiling(userId: string): Promise<TaxFiling>;
    getStatus(userId: string): Promise<TaxFiling>;
}
