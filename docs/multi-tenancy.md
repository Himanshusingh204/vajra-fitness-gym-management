# Multi-Tenancy

## Model

Every `Gym` is a tenant. Members (`MemberDetails`), trainers (`TrainerDetails`), staff (`StaffDetails`), fees (`Fee`), memberships (`Membership`), attendance (`Attendance`), bookings (`Booking`), classes (`GymClass`), inventory (`Product`), expenses (`Expense`), equipment (`Equipment`), payroll (`Payslip`), enquiries (`Enquiry`), notices (`Notice`), and audit logs (`AuditLog`) all include a `gymId` foreign key.

## Isolation Rules

1. **Middleware isolation**: `auth.middleware` attaches `userId`; `subscription.middleware` resolves `gymId` from params/body/user and verifies subscription status.
2. **Controller isolation**: Every endpoint that operates on tenant data verifies the caller's `gymId` matches the resource's `gymId`. Members can only access their own data; staff/trainers only access their assigned gym.
3. **No cross-gym queries**: No endpoint accepts arbitrary `gymId` without verification. `SUPER_ADMIN` bypasses checks but is audited.

## Branch Support

`Branch` model allows multi-branch gyms. `MemberDetails`, `TrainerDetails`, `StaffDetails`, and `GymClass` have optional `branchId`. All branch-level data remains scoped to the parent `gymId`.
