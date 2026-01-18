import { ExecutionContext } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';
interface CustomI18nResolverOptions {
}
export declare class ClientProfileLanguageResolver implements I18nResolver {
    resolve(context: ExecutionContext, options?: CustomI18nResolverOptions): Promise<string | string[] | undefined>;
}
export {};
