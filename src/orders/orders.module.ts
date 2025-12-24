import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './order.service';
import { TaxDeclaration } from './tax-declaration.entity';
import { UsersModule } from 'src/users/user.module'; // تأكد من اسم الملف الصحيح
import { PricingModule } from 'src/pricing/pricing.module';
import { OrdersController } from './orders.controller';
import { Pricing } from 'src/pricing/pricing.entity';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaxDeclaration, Pricing]),
    UsersModule,
    forwardRef(() => FilesModule),
    forwardRef(() => PricingModule),
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
