import { prisma } from './prisma';

type GymIdentity = { name?: string | null; city?: string | null; phone?: string | null; gstNumber?: string | null };
type Match = { id: string; name: string; city: string; phone: string | null; gstNumber: string | null };

const clean = (v?: string | null) => v?.trim().toLowerCase() || null;
// Phones are stored in mixed formats (+91 98765 43210, 9876543210), so compare the last 10 digits.
const phoneDigits = (v?: string | null) => {
  const digits = (v ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
};

// Another gym with the same name in the same city, the same phone, or the
// same GSTIN. Returns the clashing gym and which field clashed, or null.
export const findDuplicateGym = async (gym: GymIdentity, excludeGymId?: string) => {
  const name = clean(gym.name);
  const city = clean(gym.city);
  const phone = phoneDigits(gym.phone);
  const gstNumber = clean(gym.gstNumber);
  if (!(name && city) && !phone && !gstNumber) return null;

  const [match] = await prisma.$queryRaw<Match[]>`
    SELECT id, name, city, phone, "gstNumber" FROM "Gym"
    WHERE id <> ${excludeGymId ?? ''}
      AND ((lower(trim(name)) = ${name} AND lower(trim(city)) = ${city})
        OR right(regexp_replace(phone, '\\D', '', 'g'), 10) = ${phone}
        OR lower(trim("gstNumber")) = ${gstNumber})
    LIMIT 1`;
  if (!match) return null;

  const field = gstNumber && clean(match.gstNumber) === gstNumber ? 'gstNumber'
    : phone && phoneDigits(match.phone) === phone ? 'phone'
    : 'name';
  const message = {
    gstNumber: 'Another gym is already registered with this GST number',
    phone: 'Another gym is already registered with this phone number',
    name: `A gym called ${match.name} already exists in ${match.city}`,
  }[field];
  return { gym: match, field, message };
};
