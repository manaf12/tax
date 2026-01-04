import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1767080546691 implements MigrationInterface {
    name = 'InitialSchema1767080546691'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tax_declarations" ADD "assignedAdminId" uuid`);
        await queryRunner.query(`ALTER TABLE "tax_declarations" ADD "assignedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tax_declarations" ADD "assignedById" uuid`);
        await queryRunner.query(`ALTER TABLE "tax_declarations" ADD "assignmentHistory" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tax_declarations" DROP COLUMN "assignmentHistory"`);
        await queryRunner.query(`ALTER TABLE "tax_declarations" DROP COLUMN "assignedById"`);
        await queryRunner.query(`ALTER TABLE "tax_declarations" DROP COLUMN "assignedAt"`);
        await queryRunner.query(`ALTER TABLE "tax_declarations" DROP COLUMN "assignedAdminId"`);
    }

}
