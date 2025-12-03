// import { User } from '../users/user.entity';

// توسيع واجهة Express Request لإضافة خاصية user التي يضيفها Passport
declare global {
  namespace Express {
    interface UserPayload {
      sub: string; // User ID
      roles: string[];
      // يمكن إضافة أي خصائص أخرى يتم وضعها في الـ JWT Payload
    }

    interface Request {
      user?: UserPayload;
      csrfToken: () => string;
    }
  }
}
