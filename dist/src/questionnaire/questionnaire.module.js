"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const questionnaire_response_entity_1 = require("./questionnaire-response.entity");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
const questionnaire_service_1 = require("./questionnaire.service");
const questionnaire_controller_1 = require("./questionnaire.controller");
const orders_module_1 = require("../orders/orders.module");
const pricing_entity_1 = require("../pricing/pricing.entity");
const user_module_1 = require("../users/user.module");
const pricing_module_1 = require("../pricing/pricing.module");
let QuestionnaireModule = class QuestionnaireModule {
};
exports.QuestionnaireModule = QuestionnaireModule;
exports.QuestionnaireModule = QuestionnaireModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([questionnaire_response_entity_1.QuestionnaireResponse, tax_declaration_entity_1.TaxDeclaration, pricing_entity_1.Pricing]),
            (0, common_1.forwardRef)(() => orders_module_1.OrdersModule),
            (0, common_1.forwardRef)(() => user_module_1.UsersModule),
            (0, common_1.forwardRef)(() => pricing_module_1.PricingModule),
        ],
        providers: [questionnaire_service_1.QuestionnaireService],
        controllers: [questionnaire_controller_1.QuestionnaireController],
        exports: [questionnaire_service_1.QuestionnaireService],
    })
], QuestionnaireModule);
//# sourceMappingURL=questionnaire.module.js.map