-- Prevent a gym from holding more than one ACTIVE or PENDING SaaS subscription.
CREATE UNIQUE INDEX "GymSubscription_gymId_active_pending_idx" ON "GymSubscription"("gymId") WHERE "status" IN ('ACTIVE', 'PENDING');
