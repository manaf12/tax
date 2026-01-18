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
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const user_entity_1 = require("./users/user.entity");
const refresh_token_entity_1 = require("./auth/refresh-token.entity");
const password_reset_token_entity_1 = require("./auth/password-reset-token.entity");
const tax_declaration_entity_1 = require("./orders/tax-declaration.entity");
const payment_entity_1 = require("./payment/payment.entity");
const pricing_entity_1 = require("./pricing/pricing.entity");
const questionnaire_response_entity_1 = require("./questionnaire/questionnaire-response.entity");
const client_profile_entity_1 = require("./users/client-profile.entity");
const file_entity_1 = require("./files/file.entity");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: 'postgres://postgres:mysecretpassword@db:5432/swisstax',
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
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
});
//# sourceMappingURL=data-source.js.map