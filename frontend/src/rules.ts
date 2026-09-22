export type Rule = { name: string; explanation: string };

export const RULES: Rule[] = [
  { name: "Secret scan", explanation: "Blocks the change if it adds something that looks like a password, API key, or token." },
  { name: "Protected paths", explanation: "Blocks edits to CI config, production infrastructure, or database migrations without a human sign-off." },
  { name: "Test gate", explanation: "Blocks the change if the test suite you ran against it failed." },
  { name: "Change size", explanation: "Warns when a change adds more than 300 lines, since large diffs are harder to review." },
  { name: "Test evidence", explanation: "Warns when the diff doesn't touch a test file, so you know to check coverage by hand." },
];
