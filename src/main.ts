/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
// import * as csurf from 'csrf'; // <--- 1. استيراد csurf
// const csurf = require('csurf');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost:5173',
    'https://wells-leo-designation-median.trycloudflare.com',
    /https:\/\/[a-zA-Z0-9-]+\.(ngrok-free\.app|ngrok\.io )$/,
    '*',
  ];

  // app.use(csurf({ cookie: true }));
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if the origin is in the allowed list or matches an ngrok pattern
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        }
        // If it's a regex, test the origin against it
        return allowedOrigin.test(origin);
      });

      if (isAllowed) {
        // IMPORTANT: When credentials: true is set, the Access-Control-Allow-Origin
        // header MUST be set to the specific requesting origin, not a wildcard.
        // By passing the 'origin' back, we ensure the header is set correctly.
        callback(null, origin);
      } else {
        // Log the blocked origin for debugging
        console.error('CORS blocked origin:', origin);
        // Passing false or an error will block the request
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
  console.log(`Listening on ${process.env.PORT || 3000}`);
}
bootstrap();
