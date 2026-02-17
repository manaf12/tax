"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const orders_module_1 = require("./../orders/orders.module");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_service_1 = require("./admin.service");
const admin_controller_1 = require("./admin.controller");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
const notifications_module_1 = require("../notifications/notifications.module");
const files_module_1 = require("../files/files.module");
const user_module_1 = require("../users/user.module");
const email_module_1 = require("../email/email.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([tax_declaration_entity_1.TaxDeclaration]),
            notifications_module_1.NotificationsModule,
            (0, common_1.forwardRef)(() => orders_module_1.OrdersModule),
            files_module_1.FilesModule,
            user_module_1.UsersModule,
            email_module_1.EmailModule,
        ],
        providers: [admin_service_1.AdminService],
        controllers: [admin_controller_1.AdminController],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map