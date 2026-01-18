"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const order_service_1 = require("./order.service");
const tax_declaration_entity_1 = require("./tax-declaration.entity");
const user_module_1 = require("../users/user.module");
const pricing_module_1 = require("../pricing/pricing.module");
const orders_controller_1 = require("./orders.controller");
const pricing_entity_1 = require("../pricing/pricing.entity");
const files_module_1 = require("../files/files.module");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([tax_declaration_entity_1.TaxDeclaration, pricing_entity_1.Pricing]),
            user_module_1.UsersModule,
            (0, common_1.forwardRef)(() => files_module_1.FilesModule),
            (0, common_1.forwardRef)(() => pricing_module_1.PricingModule),
        ],
        providers: [order_service_1.OrdersService],
        controllers: [orders_controller_1.OrdersController],
        exports: [order_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map