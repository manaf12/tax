import { Repository } from 'typeorm';
import { TaxFiling } from './tax-filing.entity';
import { UsersService } from '../users/users.service';
import { PricingService } from '../pricing/pricing.service';
export declare class TaxFilingService {
    private taxFilingRepository;
    private usersService;
    private pricingService;
    constructor(taxFilingRepository: Repository<TaxFiling>, usersService: UsersService, pricingService: PricingService);
    startFilingProcess(userId: string): Promise<TaxFiling>;
    getFilingStatus(userId: string): Promise<TaxFiling>;
}
