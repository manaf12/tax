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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./auth/auth.module");
const user_module_1 = require("./users/user.module");
const file_entity_1 = require("./files/file.entity");
const questionnaire_response_entity_1 = require("./questionnaire/questionnaire-response.entity");
const user_entity_1 = require("./users/user.entity");
const refresh_token_entity_1 = require("./auth/refresh-token.entity");
const password_reset_token_entity_1 = require("./auth/password-reset-token.entity");
const config_1 = require("@nestjs/config");
const nestjs_i18n_1 = require("nestjs-i18n");
const client_profile_language_resolver_1 = require("./users/client-profile-language.resolver");
const dotenv = __importStar(require("dotenv"));
const files_module_1 = require("./files/files.module");
const client_profile_entity_1 = require("./users/client-profile.entity");
const questionnaire_module_1 = require("./questionnaire/questionnaire.module");
const tax_filing_module_1 = require("./tax-filing/tax-filing.module");
const pricing_entity_1 = require("./pricing/pricing.entity");
const notifications_module_1 = require("./notifications/notifications.module");
const tax_declaration_entity_1 = require("./orders/tax-declaration.entity");
const payment_entity_1 = require("./payment/payment.entity");
const orders_module_1 = require("./orders/orders.module");
const pricing_module_1 = require("./pricing/pricing.module");
const payment_module_1 = require("./payment/payment.module");
const admin_module_1 = require("./admin/admin.module");
const minio_module_1 = require("./minio/minio.module");
const qr_bill_module_1 = require("./qr/qr-bill.module");
const clamav_module_1 = require("./clamav/clamav.module");
const path_1 = require("path");
dotenv.config();
const fs = __importStar(require("fs"));
const distI18n = (0, path_1.join)(process.cwd(), 'dist', 'src', 'i18n');
const srcI18n = (0, path_1.join)(process.cwd(), 'src', 'i18n');
const i18nPath = fs.existsSync(distI18n) ? distI18n : srcI18n;
const watchI18n = fs.existsSync(srcI18n);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            nestjs_i18n_1.I18nModule.forRoot({
                fallbackLanguage: 'en',
                loaderOptions: {
                    path: i18nPath,
                    watch: watchI18n,
                },
                resolvers: [
                    client_profile_language_resolver_1.ClientProfileLanguageResolver,
                    nestjs_i18n_1.AcceptLanguageResolver,
                ],
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                url: process.env.DATABASE_URL ||
                    'postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-mysecretpassword}@db:5432/${POSTGRES_DB:-swisstax}',
                entities: [
                    user_entity_1.User,
                    client_profile_entity_1.ClientProfile,
                    refresh_token_entity_1.RefreshToken,
                    password_reset_token_entity_1.PasswordResetToken,
                    file_entity_1.File,
                    questionnaire_response_entity_1.QuestionnaireResponse,
                    pricing_entity_1.Pricing,
                    tax_declaration_entity_1.TaxDeclaration,
                    payment_entity_1.Payment,
                ],
                synchronize: true,
                logging: process.env.NODE_ENV !== 'production',
            }),
            auth_module_1.AuthModule,
            user_module_1.UsersModule,
            files_module_1.FilesModule,
            questionnaire_module_1.QuestionnaireModule,
            tax_filing_module_1.TaxFilingModule,
            notifications_module_1.NotificationsModule,
            orders_module_1.OrdersModule,
            pricing_module_1.PricingModule,
            payment_module_1.PaymentModule,
            admin_module_1.AdminModule,
            minio_module_1.MinioModule,
            clamav_module_1.ClamAVModule,
            qr_bill_module_1.QrBillModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map