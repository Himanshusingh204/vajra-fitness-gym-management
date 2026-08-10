import { PrismaClient, Prisma } from '@prisma/client';

// Prisma `Decimal` (decimal.js) serializes to JSON as a string via its
// `toJSON()` (e.g. "1500"). Money must reach the API as numbers, so override
// the prototype once — every res.json()/JSON.stringify then emits numbers.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function (this: Prisma.Decimal) {
  return this.toNumber();
};

export const prisma = new PrismaClient();
