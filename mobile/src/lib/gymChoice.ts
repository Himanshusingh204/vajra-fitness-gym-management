// A saved gym is only usable while the member still belongs to it.
export const isKnownGym = (saved: string, gyms: { gymId: string }[]) => gyms.some((g) => g.gymId === saved);
