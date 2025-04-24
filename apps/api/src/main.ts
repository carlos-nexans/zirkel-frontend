import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Load .env file before any other code
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: true, // You can replace this with specific origins like 'http://localhost:3001'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Update the listen call to bind to all network interfaces
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
