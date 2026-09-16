// Storage for goals, on top of the shared key/value store.

import { readList, writeList } from "@/lib/kv";
import type { Goal } from "@/lib/goals";

const GOALS_KEY = "goals";

export const readGoals = () => readList<Goal>(GOALS_KEY);

export const writeGoals = (goals: Goal[]) => writeList(GOALS_KEY, goals);

export { checkPassword } from "@/lib/kv";
