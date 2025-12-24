import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1765090568327 implements MigrationInterface {
    name = 'InitialSchema1765090568327'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "files" ADD "meta" jsonb NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "meta"`);
        await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "created_at"`);
    }

}
