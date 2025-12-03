import { Module } from '@nestjs/common';
import { ClamAVService } from './clamav.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ClamAVService],
  exports: [ClamAVService],
})
export class ClamAVModule {}
