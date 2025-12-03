import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1763948173170 implements MigrationInterface {
    name = 'InitialSchema1763948173170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_profiles" ADD "streetAddress" character varying`);
        await queryRunner.query(`ALTER TABLE "client_profiles" ADD "postalCode" character varying`);
        await queryRunner.query(`ALTER TABLE "client_profiles" ADD "city" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_profiles" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "client_profiles" DROP COLUMN "postalCode"`);
        await queryRunner.query(`ALTER TABLE "client_profiles" DROP COLUMN "streetAddress"`);
    }

}
