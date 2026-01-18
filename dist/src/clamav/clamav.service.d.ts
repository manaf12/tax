import { ConfigService } from '@nestjs/config';
export declare class ClamAVService {
    private configService;
    private readonly logger;
    private readonly host;
    private readonly port;
    constructor(configService: ConfigService);
    scanBuffer(fileBuffer: Buffer): Promise<boolean>;
}
