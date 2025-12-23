import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { ParseJsonAndBooleanPipe } from './common/pipes/parse-json-fields.pipe';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.useGlobalPipes(
  //   new ParseJsonAndBooleanPipe(
  //     ['amenity'], // JSON fields
  //     [
  //       'show_email',
  //       'show_official_phone',
  //       'show_personal_phone',
  //       'is_published',
  //     ], // Boolean fields
  //   ),
  // );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.use(cookieParser());

  // Note: Middleware is usually registered in modules, but for global functional middleware we can use app.use()
  // However, NestJS middleware class should be registered in a module (e.g. AppModule) via configure().
  // For simplicity, let's just use the pipe and filter here. Middleware will be added to AppModule.

  app.enableCors({
    origin: [
      'http://localhost:3000', // local frontend
      'https://recordy.vercel.app', // production frontend
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
