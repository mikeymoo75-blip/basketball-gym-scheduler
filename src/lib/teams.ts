export type TeamWithCoaches = { coachIds: string[] };

export function assignedTeams<T extends TeamWithCoaches>(teams: T[], personId: string): T[] {
  return teams.filter((team) => team.coachIds.includes(personId));
}

/** Teams a person may tag on a practice. Coaches get assigned teams only. Admins may book any team. */
export function teamsForPerson<T extends TeamWithCoaches>(
  teams: T[],
  personId: string,
  personIsAdmin: boolean,
): T[] {
  if (personIsAdmin) return teams;
  return assignedTeams(teams, personId);
}
