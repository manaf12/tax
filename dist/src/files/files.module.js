"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const file_entity_1 = require("./file.entity");
const files_service_1 = require("./files.service");
const files_controller_1 = require("./files.controller");
const orders_module_1 = require("../orders/orders.module");
const minio_module_1 = require("../minio/minio.module");
const clamav_module_1 = require("../clamav/clamav.module");
const user_module_1 = require("../users/user.module");
let FilesModule = class FilesModule {
};
exports.FilesModule = FilesModule;
exports.FilesModule = FilesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([file_entity_1.File]),
            (0, common_1.forwardRef)(() => orders_module_1.OrdersModule),
            user_module_1.UsersModule,
            minio_module_1.MinioModule,
            clamav_module_1.ClamAVModule,
        ],
        providers: [files_service_1.FilesService],
        controllers: [files_controller_1.FilesController],
        exports: [files_service_1.FilesService],
    })
], FilesModule);
//# sourceMappingURL=files.module.js.map