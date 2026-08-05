"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'admin@vajrafitness.com';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('Super Admin already exists.');
        return;
    }
    const hashedPassword = await bcrypt_1.default.hash('admin123', 10);
    await prisma.user.create({
        data: {
            username: 'System Administrator',
            email,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            phone: '0000000000'
        }
    });
    console.log('Super Admin seeded successfully: admin@vajrafitness.com / admin123');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seedSuperAdmin.js.map