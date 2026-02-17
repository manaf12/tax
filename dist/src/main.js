"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    const allowedOrigins = new Set([
        'https://www.taxero.ch',
        'https://taxero.ch',
        'http://localhost:3100',
        'http://localhost:5173',
        'https://localhost:5173',
        'https://wells-leo-designation-median.trycloudflare.com',
    ]);
    const ngrokRegex = /^https:\/\/[a-zA-Z0-9-]+\.(ngrok-free\.app|ngrok\.io)$/;
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.has(origin) || ngrokRegex.test(origin)) {
                return callback(null, true);
            }
            console.error('CORS blocked origin:', origin);
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Accept',
            'Authorization',
            'X-Requested-With',
        ],
        optionsSuccessStatus: 204,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
    console.log(`Listening on ${process.env.PORT || 3000}`);
}
bootstrap();
//# sourceMappingURL=main.js.map