import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuestionnaireResponseId1767619883625 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add column if missing
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'tax_declarations'
            AND column_name = 'questionnaireResponseId'
        ) THEN
          ALTER TABLE "tax_declarations"
          ADD COLUMN "questionnaireResponseId" uuid NULL;
        END IF;
      END$$;
    `);

    // 2) Add unique partial index if missing
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'UQ_tax_declarations_questionnaireResponseId'
        ) THEN
          CREATE UNIQUE INDEX "UQ_tax_declarations_questionnaireResponseId"
          ON "tax_declarations" ("questionnaireResponseId")
          WHERE "questionnaireResponseId" IS NOT NULL;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_tax_declarations_questionnaireResponseId";
    `);

    await queryRunner.query(`
      ALTER TABLE "tax_declarations"
      DROP COLUMN IF EXISTS "questionnaireResponseId";
    `);
  }
}
