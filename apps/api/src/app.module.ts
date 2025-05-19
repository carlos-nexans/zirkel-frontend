import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as path from 'path';

@Module({
  imports: [
    CacheModule.register({
      ttl: 600000, // 10 minutes in milliseconds
      max: 100, // maximum number of items in cache
    }),
    // eslint-disable-next-line
    ServeStaticModule.forRootAsync({
      useFactory: () => [
        {
          rootPath: path.resolve(process.env.IMAGES_PATH || ''),
          serveRoot: '/media',
          serveStaticOptions: {
            fallthrough: false,
            index: false,
          },
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
