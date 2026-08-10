import "dotenv/config"
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser())

  app.useGlobalPipes(new ValidationPipe({
    whitelist:true,
    forbidNonWhitelisted:true,
    transform:true,
  }))

  app.setGlobalPrefix("/api/v1");
  app.enableCors({
    origin:process.env.FRONTEND_URL||"http://localhost:5173",
    credentials:true,
    method:["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
    allowedHeaders:["Content-Type","Authorizations"]
  });
  app.useGlobalInterceptors(new TransformInterceptor())
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
