import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeOnDeclarationRelations1772093381315
  implements MigrationInterface
{
  name = 'AddCascadeOnDeclarationRelations1772093381315';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" DROP CONSTRAINT "FK_0f7a68fa3e05246ccb194108919"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing" DROP CONSTRAINT "FK_770ad0312612bf82e0b21b55910"`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f92757f4ddc23dfc594166ac0f" ON "tax_declarations" ("assignedAdminId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "FK_0f7a68fa3e05246ccb194108919" FOREIGN KEY ("declarationId") REFERENCES "tax_declarations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing" ADD CONSTRAINT "FK_770ad0312612bf82e0b21b55910" FOREIGN KEY ("declaration_id") REFERENCES "tax_declarations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pricing" DROP CONSTRAINT "FK_770ad0312612bf82e0b21b55910"`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" DROP CONSTRAINT "FK_0f7a68fa3e05246ccb194108919"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_f92757f4ddc23dfc594166ac0f"`,
    );

    await queryRunner.query(
      `ALTER TABLE "pricing" ADD CONSTRAINT "FK_770ad0312612bf82e0b21b55910" FOREIGN KEY ("declaration_id") REFERENCES "tax_declarations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "FK_0f7a68fa3e05246ccb194108919" FOREIGN KEY ("declarationId") REFERENCES "tax_declarations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
