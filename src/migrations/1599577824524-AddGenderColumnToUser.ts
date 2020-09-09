import {MigrationInterface, QueryRunner} from "typeorm";

export class AddGenderColumnToUser1599577824524 implements MigrationInterface {
    name = 'AddGenderColumnToUser1599577824524'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "gender" character varying NOT NULL DEFAULT 'X'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "gender" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "gender"`);
    }

}
