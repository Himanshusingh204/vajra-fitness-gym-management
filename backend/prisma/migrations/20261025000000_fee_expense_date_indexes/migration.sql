-- CreateIndex
CREATE INDEX "Fee_gymId_paymentDate_idx" ON "Fee"("gymId", "paymentDate");

-- CreateIndex
CREATE INDEX "Expense_gymId_date_idx" ON "Expense"("gymId", "date");
