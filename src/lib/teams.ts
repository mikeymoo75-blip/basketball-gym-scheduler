export type TeamWithCoaches = { coachIds: string[] };

/** Teams a person may tag on a practice. Assigned teams win. An admin with none may book any team. */
export function teamsForPerson<T extends TeamWithCoaches>(
  teams: T[],
  personId: string,
  personIsAdmin: boolean,
): T[] {
  const assigned = teams.filter((team) => team.coachIds.includes(personId));
  if (assigned.length > 0) return assigned;
  return personIsAdmin ? teams : [];
}
