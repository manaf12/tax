import { Module } from '@nestjs/common';
import { QrBillController } from './qr-bill.controller';
import { QrBillService } from './qr-bill.service';
@Module({
  controllers: [QrBillController],
  providers: [QrBillService],
  exports: [QrBillService],
})
export class QrBillModule {}
