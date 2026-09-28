import type { SajuInput } from "./chart";

export type ReusedBirthInput = {
  date: string;
  time: string;
  unknownTime: boolean;
};

export function toReusedBirthInput(input: SajuInput): ReusedBirthInput {
  const unknownTime = input.unknownTime === true;
  return {
    date: input.date,
    time: unknownTime ? "" : input.time,
    unknownTime,
  };
}
