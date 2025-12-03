/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';
import { Request } from 'express';

import { UserPayload } from '../types/request.d';

// ... (بقية الكود)
interface CustomI18nResolverOptions {}
@Injectable()
export class ClientProfileLanguageResolver implements I18nResolver {
  // ... (بقية الكود)

  async resolve(
    context: ExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: CustomI18nResolverOptions,
  ): Promise<string | string[] | undefined> {
    // استخدم Request مباشرة من Express بدلاً من CustomRequest
    const request = context.switchToHttp().getRequest() as Request;

    // الآن، خاصية request.user ستكون معروفة بفضل Module Augmentation
    const userId = (request.user as UserPayload)?.sub;

    if (userId) {
      // ... (بقية الكود)
    }

    return undefined;
  }
}
