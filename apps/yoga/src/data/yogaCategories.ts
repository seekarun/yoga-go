/**
 * Yoga niche categories for expert onboarding
 *
 * SOURCE OF TRUTH: src/data/categories.json
 *
 * To add a new category:
 * 1. Edit src/data/categories.json
 * 2. Add a new entry to the "yoga_niche_dropdown" array with:
 *    - category: Display name for the dropdown
 *    - hint: Short description shown below the category name
 *    - hook.problem_hook: Question that resonates with target audience (used as hero headline)
 *    - hook.solution_hook: How you solve their problem (used as hero description)
 *    - value_propositions: Array of 3 benefits (title, description, image_prompt)
 *    - about_me: Bio text with **markdown** for emphasis (used in About section)
 *
 * The app imports this JSON at build time, so changes require a rebuild.
 */

import categoriesData from './categories.json';

export interface ValueProposition {
  title: string;
  description: string;
  image_prompt: string;
}

export interface YogaCategory {
  category: string;
  hint: string;
  hook: {
    problem_hook: string;
    solution_hook: string;
  };
  value_propositions: ValueProposition[];
  about_me: string;
}

// Export typed categories from JSON
export const yogaCategories: YogaCategory[] = categoriesData.yoga_niche_dropdown;

export default yogaCategories;
