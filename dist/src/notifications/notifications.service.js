"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("../email/email.service");
const notification_type_1 = require("./notification-type");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    emailService;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(emailService) {
        this.emailService = emailService;
    }
    async sendDeclarationNotification(declaration, type, data = {}) {
        if (!declaration.clientProfile ||
            !declaration.clientProfile.user ||
            !declaration.clientProfile.user.email) {
            this.logger.error(`Cannot send notification: User or ClientProfile not loaded for declaration ${declaration.id}`);
            return;
        }
        const userEmail = declaration.clientProfile.user.email;
        const subject = this.getSubject(type);
        const body = this.getTemplate(type, declaration, data);
        try {
            await this.emailService.sendMail(userEmail, subject, body);
            this.logger.log(`Notification ${type} sent to ${userEmail}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email notification: ${error.message}`);
        }
    }
    getSubject(type) {
        switch (type) {
            case notification_type_1.NotificationType.PRICING_READY:
                return 'SwissTaxOnline: تسعير إقرارك الضريبي جاهز للمراجعة';
            case notification_type_1.NotificationType.PRICING_ACCEPTED:
                return 'SwissTaxOnline: تم قبول التسعير بنجاح';
            case notification_type_1.NotificationType.FILING_IN_REVIEW:
                return 'SwissTaxOnline: إقرارك الضريبي قيد المراجعة';
            case notification_type_1.NotificationType.FILING_COMPLETED:
                return 'SwissTaxOnline: تم إكمال إقرارك الضريبي بنجاح';
            default:
                return 'SwissTaxOnline: تحديث جديد لحالة إقرارك';
        }
    }
    getTemplate(type, declaration, data) {
        let html = `<h1>مرحباً ${declaration.clientProfile.user.email || 'عميلنا'}،</h1>`;
        switch (type) {
            case notification_type_1.NotificationType.PRICING_READY:
                html += `<p>لقد تم حساب تسعير إقرارك الضريبي رقم ${declaration.id}.</p>`;
                html += `<p>السعر النهائي هو: **${data.finalPrice} CHF**.</p>`;
                html += `<p>يرجى تسجيل الدخول للموافقة على التسعير والمتابعة إلى الدفع.</p>`;
                break;
            case notification_type_1.NotificationType.PRICING_ACCEPTED:
                html += `<p>شكراً لك! لقد قمت بقبول التسعير بنجاح.</p>`;
                html += `<p>يمكنك الآن المتابعة إلى صفحة الدفع لإكمال طلبك.</p>`;
                break;
            case notification_type_1.NotificationType.FILING_IN_REVIEW:
                html += `<p>تم استلام دفعتك بنجاح. إقرارك الضريبي رقم ${declaration.id} قيد المراجعة الآن من قبل فريقنا.</p>`;
                break;
            case notification_type_1.NotificationType.FILING_COMPLETED:
                html += `<p>تهانينا! لقد تم إكمال إقرارك الضريبي رقم ${declaration.id} بنجاح.</p>`;
                html += `<p>يمكنك تنزيل المستندات النهائية من لوحة التحكم الخاصة بك.</p>`;
                break;
            default:
                html += `<p>هناك تحديث جديد لحالة إقرارك الضريبي رقم ${declaration.id}. الحالة الجديدة: ${declaration.status}</p>`;
                break;
        }
        html += `<p>مع تحيات فريق SwissTaxOnline.</p>`;
        return html;
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map