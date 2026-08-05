"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const users = await prisma.user.findMany();
    console.log('Current users:', users.length);
    const superAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
    });
    if (!superAdmin) {
        console.log('No Super Admin found. Creating one...');
        const hashedPassword = await bcrypt_1.default.hash('admin123', 10);
        const newAdmin = await prisma.user.create({
            data: {
                email: 'admin@vajrafitness.com',
                username: 'VajraAdmin',
                password: hashedPassword,
                role: 'SUPER_ADMIN'
            }
        });
        console.log('Created Super Admin:', newAdmin.email, 'password: admin123');
    }
    else {
        console.log('Super Admin exists:', superAdmin.email);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-users.js.map