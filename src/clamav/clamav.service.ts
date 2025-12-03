import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as net from 'net';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClamAVService {
  private readonly logger = new Logger(ClamAVService.name);
  private readonly host: string;
  private readonly port: number;

  constructor(private configService: ConfigService) {
    this.host = this.configService.get<string>('CLAMAV_HOST', 'clamav');
    this.port = this.configService.get<number>('CLAMAV_PORT', 3310);
  }

  /**
   * يفحص Buffer من البيانات بحثًا عن الفيروسات باستخدام ClamAV.
   * @param fileBuffer محتوى الملف كـ Buffer.
   * @returns true إذا كان الملف نظيفًا، false إذا تم اكتشاف فيروس.
   */
  async scanBuffer(fileBuffer: Buffer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(
        { host: this.host, port: this.port },
        () => {
          client.write('zINSTREAM\0'); // أمر بدء فحص البث
          let offset = 0;
          const chunkSize = 1024 * 1024; // 1MB chunk size

          const sendChunk = () => {
            if (offset >= fileBuffer.length) {
              client.write(Buffer.from([0, 0, 0, 0])); // إرسال طول صفر لإنهاء البث
              return;
            }

            const end = Math.min(offset + chunkSize, fileBuffer.length);
            const chunk = fileBuffer.slice(offset, end);

            const sizeBuffer = Buffer.alloc(4);
            sizeBuffer.writeUInt32BE(chunk.length, 0);

            client.write(sizeBuffer);
            client.write(chunk);

            offset = end;
            sendChunk();
          };

          sendChunk();
        },
      );

      let response = '';
      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('end', () => {
        client.end();
        this.logger.debug(`ClamAV response: ${response.trim()}`);

        if (response.includes('FOUND')) {
          this.logger.warn(`Virus detected: ${response.trim()}`);
          resolve(false); // تم اكتشاف فيروس
        } else if (response.includes('OK')) {
          resolve(true); // الملف نظيف
        } else {
          this.logger.error(
            `ClamAV scan failed with unexpected response: ${response.trim()}`,
          );
          reject(
            new InternalServerErrorException(
              'Virus scanner returned an unexpected status.',
            ),
          );
        }
      });

      client.on('error', (err) => {
        this.logger.error(`ClamAV connection error: ${err.message}`);
        reject(
          new InternalServerErrorException(
            'Virus scanner not available or connection failed.',
          ),
        );
      });
    });
  }
}
