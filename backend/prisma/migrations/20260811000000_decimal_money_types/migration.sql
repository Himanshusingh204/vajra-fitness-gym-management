-- Convert money fields from FLOAT (double precision) to DECIMAL(10,2) so
-- currency values never suffer floating-point precision loss.
-- The `USING col::numeric(10,2)` casts preserve existing data.

ALTER TABLE "Product" ALTER COLUMN "purchasePrice" SET DATA TYPE DECIMAL(10,2) USING "purchasePrice"::numeric(10,2);
ALTER TABLE "Product" ALTER COLUMN "sellingPrice" SET DATA TYPE DECIMAL(10,2) USING "sellingPrice"::numeric(10,2);

ALTER TABLE "Sale" ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2) USING "total"::numeric(10,2);
ALTER TABLE "Sale" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(10,2) USING "discount"::numeric(10,2);
ALTER TABLE "Sale" ALTER COLUMN "tax" SET DATA TYPE DECIMAL(10,2) USING "tax"::numeric(10,2);
ALTER TABLE "Sale" ALTER COLUMN "finalAmount" SET DATA TYPE DECIMAL(10,2) USING "finalAmount"::numeric(10,2);

ALTER TABLE "SaleItem" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(10,2) USING "unitPrice"::numeric(10,2);
ALTER TABLE "SaleItem" ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2) USING "total"::numeric(10,2);

ALTER TABLE "Expense" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2) USING "amount"::numeric(10,2);

ALTER TABLE "Equipment" ALTER COLUMN "purchaseCost" SET DATA TYPE DECIMAL(10,2) USING "purchaseCost"::numeric(10,2);

ALTER TABLE "EquipmentMaintenance" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(10,2) USING "cost"::numeric(10,2);

ALTER TABLE "Payslip" ALTER COLUMN "basicSalary" SET DATA TYPE DECIMAL(10,2) USING "basicSalary"::numeric(10,2);
ALTER TABLE "Payslip" ALTER COLUMN "bonuses" SET DATA TYPE DECIMAL(10,2) USING "bonuses"::numeric(10,2);
ALTER TABLE "Payslip" ALTER COLUMN "deductions" SET DATA TYPE DECIMAL(10,2) USING "deductions"::numeric(10,2);
ALTER TABLE "Payslip" ALTER COLUMN "netPay" SET DATA TYPE DECIMAL(10,2) USING "netPay"::numeric(10,2);

ALTER TABLE "Referral" ALTER COLUMN "rewardValue" SET DATA TYPE DECIMAL(10,2) USING "rewardValue"::numeric(10,2);
