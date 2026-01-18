import { OrdersService } from './order.service';
import type { UserPayload } from '../types/request.d';
import { TaxDeclaration } from './tax-declaration.entity';
import { UpdateStepDto } from './dto/update-step.dto';
import { AddStepCommentDto } from './dto/add-step-comment.dto';
import { UsersService } from 'src/users/users.service';
export declare class OrdersController {
    private readonly ordersService;
    private readonly userService;
    constructor(ordersService: OrdersService, userService: UsersService);
    createDraft(req: {
        user: UserPayload;
    }): Promise<TaxDeclaration>;
    getMyDeclarations(req: {
        user: UserPayload;
    }): Promise<TaxDeclaration[]>;
    getDeclarationDetails(declarationId: string, req: {
        user: UserPayload;
    }): Promise<TaxDeclaration>;
    submitDraft(declarationId: string, user: UserPayload): Promise<TaxDeclaration>;
    updateStep(declarationId: string, body: UpdateStepDto, adminId: string): Promise<TaxDeclaration>;
    confirmDownload(declarationId: string, stepId: string, userId: string, body?: {
        fileId?: string;
    }): Promise<TaxDeclaration>;
    addStepComment(declarationId: string, stepId: string, body: AddStepCommentDto, req: any, userId: string): Promise<{
        ok: boolean;
        meta: any;
    }>;
    confirmStep1(declarationId: string, userId: string): Promise<{
        ok: boolean;
    }>;
}
