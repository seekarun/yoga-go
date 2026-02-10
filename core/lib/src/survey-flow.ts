/**
 * Survey Flow Engine — pure functions for executing and validating
 * conditional survey branching.
 */

import type { SurveyQuestion, SurveyAnswer } from "@core/types";

/**
 * Returns the entry-point question — the first question that has no
 * incoming branches from any other question (or the lowest-order question
 * as a fallback).
 */
export function getStartQuestion(
  questions: SurveyQuestion[],
): SurveyQuestion | null {
  if (questions.length === 0) return null;

  // Collect all question IDs that are targets of at least one branch
  const incomingTargets = new Set<string>();
  for (const q of questions) {
    for (const b of q.branches ?? []) {
      if (b.nextQuestionId) {
        incomingTargets.add(b.nextQuestionId);
      }
    }
  }

  // First question with no incoming branch
  const root = questions.find((q) => !incomingTargets.has(q.id));
  if (root) return root;

  // Fallback: lowest order
  return [...questions].sort((a, b) => a.order - b.order)[0] ?? null;
}

/**
 * Given a question and the user's answer, returns the next question ID
 * (or null to end the survey).
 *
 * For MC questions the answer is matched against branch optionIds.
 * For text questions the default branch (optionId undefined) is used.
 * If no branches are defined, returns null (end).
 */
export function getNextQuestionId(
  question: SurveyQuestion,
  answer?: string,
): string | null {
  // Finish nodes are terminal — no next question
  if (question.type === "finish") return null;

  const branches = question.branches ?? [];
  if (branches.length === 0) return null;

  const hasOptionBranching =
    question.type === "multiple-choice" ||
    (question.type === "text" && question.inference === "process");
  if (hasOptionBranching && answer) {
    // Try to find a branch matching the specific option
    const match = branches.find((b) => b.optionId === answer);
    if (match) return match.nextQuestionId;
  }

  // Default / fallback branch (optionId undefined)
  const fallback = branches.find((b) => !b.optionId);
  return fallback?.nextQuestionId ?? null;
}

/**
 * Given all questions and the answers collected so far, walk the branching
 * graph and return the ordered list of visited question IDs plus the next
 * pending question (or null if the survey is complete).
 */
export function buildQuestionPath(
  questions: SurveyQuestion[],
  answers: SurveyAnswer[],
): { visited: string[]; next: SurveyQuestion | null } {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

  const start = getStartQuestion(questions);
  if (!start) return { visited: [], next: null };

  const visited: string[] = [];
  let current: SurveyQuestion | null = start;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current.id)) break; // cycle guard
    seen.add(current.id);

    const userAnswer = answerMap.get(current.id);
    if (userAnswer === undefined) {
      // This is the next unanswered question
      return { visited, next: current };
    }

    visited.push(current.id);
    const nextId = getNextQuestionId(current, userAnswer);
    current = nextId ? (qMap.get(nextId) ?? null) : null;
  }

  return { visited, next: null };
}

/**
 * Validates a survey's question flow:
 * - All branch targets reference existing question IDs (or null for end)
 * - All questions are reachable from the start question
 * - No duplicate question IDs
 *
 * Returns an array of error strings (empty = valid).
 */
export function validateSurveyFlow(questions: SurveyQuestion[]): string[] {
  const errors: string[] = [];
  if (questions.length === 0) return errors;

  const ids = new Set(questions.map((q) => q.id));

  // Check for duplicate IDs
  if (ids.size !== questions.length) {
    errors.push("Duplicate question IDs found");
  }

  // Validate branch targets
  for (const q of questions) {
    for (const b of q.branches ?? []) {
      if (b.nextQuestionId !== null && !ids.has(b.nextQuestionId)) {
        errors.push(
          `Question "${q.id}" has a branch to unknown question "${b.nextQuestionId}"`,
        );
      }
    }
  }

  // Check reachability from start
  const start = getStartQuestion(questions);
  if (!start) {
    errors.push("No start question found");
    return errors;
  }

  const reachable = new Set<string>();
  const queue = [start.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);

    const q = questions.find((q) => q.id === id);
    if (!q) continue;
    for (const b of q.branches ?? []) {
      if (b.nextQuestionId && !reachable.has(b.nextQuestionId)) {
        queue.push(b.nextQuestionId);
      }
    }
  }

  const unreachable = questions.filter((q) => !reachable.has(q.id));
  for (const q of unreachable) {
    errors.push(
      `Question "${q.id}" ("${q.questionText}") is not reachable from the start`,
    );
  }

  return errors;
}
