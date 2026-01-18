"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const pricing_entity_1 = require("./pricing.entity");
const pricing_service_1 = require("./pricing.service");
const pricing_controller_1 = require("./pricing.controller");
const questionnaire_module_1 = require("../questionnaire/questionnaire.module");
const orders_module_1 = require("../orders/orders.module");
const notifications_module_1 = require("../notifications/notifications.module");
let PricingModule = class PricingModule {
};
exports.PricingModule = PricingModule;
exports.PricingModule = PricingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([pricing_entity_1.Pricing]),
            (0, common_1.forwardRef)(() => orders_module_1.OrdersModule),
            (0, common_1.forwardRef)(() => questionnaire_module_1.QuestionnaireModule),
            notifications_module_1.NotificationsModule,
        ],
        providers: [pricing_service_1.PricingService],
        controllers: [pricing_controller_1.PricingController],
        exports: [pricing_service_1.PricingService],
    })
], PricingModule);
//# sourceMappingURL=pricing.module.js.map