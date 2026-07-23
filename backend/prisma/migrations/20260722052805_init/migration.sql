-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'OFFICE_STAFF', 'SITE_SUPERVISOR') NOT NULL,
    `site_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `gst_number` VARCHAR(191) NULL,
    `address` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `clients_company_name_idx`(`company_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sites` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `supervisor_name` VARCHAR(191) NOT NULL,
    `contact_number` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `sites_client_id_idx`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `employee_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `aadhaar` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NOT NULL,
    `salary` DECIMAL(12, 2) NOT NULL,
    `joining_date` DATE NOT NULL,
    `site_id` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_employee_code_key`(`employee_code`),
    INDEX `employees_site_id_idx`(`site_id`),
    INDEX `employees_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `site_id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attendances_site_id_date_idx`(`site_id`, `date`),
    INDEX `attendances_date_idx`(`date`),
    UNIQUE INDEX `attendances_employee_id_date_key`(`employee_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` VARCHAR(191) NOT NULL,
    `quotation_number` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `site_id` VARCHAR(191) NOT NULL,
    `terms` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `gst_percent` DECIMAL(5, 2) NOT NULL,
    `gst_amount` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quotations_quotation_number_key`(`quotation_number`),
    INDEX `quotations_client_id_idx`(`client_id`),
    INDEX `quotations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` VARCHAR(191) NOT NULL,
    `quotation_id` VARCHAR(191) NOT NULL,
    `service_description` TEXT NOT NULL,
    `number_of_employees` INTEGER NOT NULL,
    `rate` DECIMAL(12, 2) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    INDEX `quotation_items_quotation_id_idx`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `site_id` VARCHAR(191) NOT NULL,
    `period_from` DATE NOT NULL,
    `period_to` DATE NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `gst_percent` DECIMAL(5, 2) NOT NULL,
    `gst_amount` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    INDEX `invoices_client_id_idx`(`client_id`),
    INDEX `invoices_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `service_details` TEXT NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `rate` DECIMAL(12, 2) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    INDEX `invoice_items_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bills` (
    `id` VARCHAR(191) NOT NULL,
    `bill_number` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `billing_month` VARCHAR(191) NOT NULL,
    `attendance_year` INTEGER NOT NULL,
    `attendance_month` INTEGER NOT NULL,
    `total_employees` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `gst_percent` DECIMAL(5, 2) NOT NULL,
    `gst_amount` DECIMAL(12, 2) NOT NULL,
    `grand_total` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bills_bill_number_key`(`bill_number`),
    INDEX `bills_invoice_id_idx`(`invoice_id`),
    INDEX `bills_billing_month_idx`(`billing_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_sequences` (
    `id` VARCHAR(191) NOT NULL,
    `document_type` ENUM('QUOTATION', 'INVOICE', 'BILL') NOT NULL,
    `year` INTEGER NOT NULL,
    `last_number` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_sequences_document_type_key`(`document_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sites` ADD CONSTRAINT `sites_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
