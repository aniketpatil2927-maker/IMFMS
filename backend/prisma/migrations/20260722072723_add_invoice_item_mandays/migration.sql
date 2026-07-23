-- AlterTable
ALTER TABLE `invoice_items` ADD COLUMN `actual_mandays` DECIMAL(12, 2) NULL,
    ADD COLUMN `mandays` DECIMAL(12, 2) NULL;
