"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClamAVService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClamAVService = void 0;
const common_1 = require("@nestjs/common");
const net = __importStar(require("net"));
const config_1 = require("@nestjs/config");
let ClamAVService = ClamAVService_1 = class ClamAVService {
    configService;
    logger = new common_1.Logger(ClamAVService_1.name);
    host;
    port;
    constructor(configService) {
        this.configService = configService;
        this.host = this.configService.get('CLAMAV_HOST', 'clamav');
        this.port = this.configService.get('CLAMAV_PORT', 3310);
    }
    async scanBuffer(fileBuffer) {
        return new Promise((resolve, reject) => {
            const client = net.createConnection({ host: this.host, port: this.port }, () => {
                client.write('zINSTREAM\0');
                let offset = 0;
                const chunkSize = 1024 * 1024;
                const sendChunk = () => {
                    if (offset >= fileBuffer.length) {
                        client.write(Buffer.from([0, 0, 0, 0]));
                        return;
                    }
                    const end = Math.min(offset + chunkSize, fileBuffer.length);
                    const chunk = fileBuffer.slice(offset, end);
                    const sizeBuffer = Buffer.alloc(4);
                    sizeBuffer.writeUInt32BE(chunk.length, 0);
                    client.write(sizeBuffer);
                    client.write(chunk);
                    offset = end;
                    sendChunk();
                };
                sendChunk();
            });
            let response = '';
            client.on('data', (data) => {
                response += data.toString();
            });
            client.on('end', () => {
                client.end();
                this.logger.debug(`ClamAV response: ${response.trim()}`);
                if (response.includes('FOUND')) {
                    this.logger.warn(`Virus detected: ${response.trim()}`);
                    resolve(false);
                }
                else if (response.includes('OK')) {
                    resolve(true);
                }
                else {
                    this.logger.error(`ClamAV scan failed with unexpected response: ${response.trim()}`);
                    reject(new common_1.InternalServerErrorException('Virus scanner returned an unexpected status.'));
                }
            });
            client.on('error', (err) => {
                this.logger.error(`ClamAV connection error: ${err.message}`);
                reject(new common_1.InternalServerErrorException('Virus scanner not available or connection failed.'));
            });
        });
    }
};
exports.ClamAVService = ClamAVService;
exports.ClamAVService = ClamAVService = ClamAVService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClamAVService);
//# sourceMappingURL=clamav.service.js.map