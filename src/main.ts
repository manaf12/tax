/* eslint-disable @typescript-eslint/no-unsafe-return */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
// import * as csurf from 'csrf'; // <--- 1. استيراد csurf
// const csurf = require('csurf');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  const allowedOrigins = new Set<string>([
    'https://www.taxero.ch',
    'https://taxero.ch',
    'http://localhost:5173',
    'https://localhost:5173',
    'https://wells-leo-designation-median.trycloudflare.com',
  ]);
  const ngrokRegex = /^https:\/\/[a-zA-Z0-9-]+\.(ngrok-free\.app|ngrok\.io)$/;
  // app.use(csurf({ cookie: true }));
  app.enableCors({
    origin: (origin, callback) => {
      // requests بدون Origin (curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin) || ngrokRegex.test(origin)) {
        // خليه يسمح ويرجع true (cors package سيضع Origin الصحيح)
        return callback(null, true);
      }

      console.error('CORS blocked origin:', origin);

      // IMPORTANT: لا ترمي Error لأن ذلك يُترجم غالبًا إلى 500
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
  console.log(`Listening on ${process.env.PORT || 3000}`);
}
bootstrap();
