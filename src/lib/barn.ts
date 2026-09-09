export const BARN_BOOKING_MESSAGE =
  "To book the Barn, Please contact Kathy Lamonte";

export function isBarnGym(name: string | null | undefined) {
  return name?.trim().toLowerCase() === "the barn";
}

export function firstBookableGym<T extends { id: string; name: string }>(gyms: T[]) {
  return gyms.find((gym) => !isBarnGym(gym.name));
}
