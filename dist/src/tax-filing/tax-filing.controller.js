"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxFilingController = void 0;
const common_1 = require("@nestjs/common");
const tax_filing_service_1 = require("./tax-filing.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const user_decorator_1 = require("../auth/user.decorator");
let TaxFilingController = class TaxFilingController {
    taxFilingService;
    constructor(taxFilingService) {
        this.taxFilingService = taxFilingService;
    }
    async startFiling(userId) {
        return this.taxFilingService.startFilingProcess(userId);
    }
    async getStatus(userId) {
        return this.taxFilingService.getFilingStatus(userId);
    }
};
exports.TaxFilingController = TaxFilingController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaxFilingController.prototype, "startFiling", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaxFilingController.prototype, "getStatus", null);
exports.TaxFilingController = TaxFilingController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('tax-filing'),
    __metadata("design:paramtypes", [tax_filing_service_1.TaxFilingService])
], TaxFilingController);
//# sourceMappingURL=tax-filing.controller.js.map