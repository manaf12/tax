import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './file.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { OrdersModule } from 'src/orders/orders.module';
import { MinioModule } from 'src/minio/minio.module';
import { ClamAVModule } from 'src/clamav/clamav.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    OrdersModule, // نحتاج UsersModule للوصول إلى ClientProfile
    MinioModule,
    ClamAVModule,
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
