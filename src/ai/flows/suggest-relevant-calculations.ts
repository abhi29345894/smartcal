// This is an experimental implementation only; it does not persist calculation history and always returns the same suggestion.
'use server';
/**
 * @fileOverview Provides suggestions for relevant calculations based on user activity.
 *
 * - suggestRelevantCalculations - A function that suggests relevant calculations.
 * - SuggestRelevantCalculationsInput - The input type for the suggestRelevantCalculations function.
 * - SuggestRelevantCalculationsOutput - The return type for the suggestRelevantCalculations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelevantCalculationsInputSchema = z.object({
  currentCalculationType: z
    .string()
    .describe('The type of the current calculation being performed by the user.'),
  recentCalculationTypes: z
    .array(z.string())
    .describe('An array of the types of recent calculations performed by the user.'),
});
export type SuggestRelevantCalculationsInput = z.infer<
  typeof SuggestRelevantCalculationsInputSchema
>;

const SuggestRelevantCalculationsOutputSchema = z.object({
  suggestedCalculation: z
    .string()
    .describe(
      'A suggestion for a relevant calculation based on the current and recent calculations.'
    ),
});
export type SuggestRelevantCalculationsOutput = z.infer<
  typeof SuggestRelevantCalculationsOutputSchema
>;

export async function suggestRelevantCalculations(
  input: SuggestRelevantCalculationsInput
): Promise<SuggestRelevantCalculationsOutput> {
  return suggestRelevantCalculationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelevantCalculationsPrompt',
  input: {schema: SuggestRelevantCalculationsInputSchema},
  output: {schema: SuggestRelevantCalculationsOutputSchema},
  prompt: `You are a calculation suggestion AI. Based on the user's current calculation type ({{{currentCalculationType}}}) and recent calculation types ({{{recentCalculationTypes}}}), suggest a relevant calculation the user might want to perform next. Suggest only one calculation type.

Suggestion:`,
});

const suggestRelevantCalculationsFlow = ai.defineFlow(
  {
    name: 'suggestRelevantCalculationsFlow',
    inputSchema: SuggestRelevantCalculationsInputSchema,
    outputSchema: SuggestRelevantCalculationsOutputSchema,
  },
  async input => {
    // This is an experimental implementation only; it does not persist calculation history and always returns the same suggestion.
    // A real implementation would persist the recentCalculationTypes in a database or session.
    if (input.currentCalculationType === 'loan') {
      return {suggestedCalculation: 'EMI calculation'};
    } else if (input.currentCalculationType === 'discount') {
      return {suggestedCalculation: 'Savings calculation'};
    } else {
      const {output} = await prompt(input);
      return output!;
    }
  }
);
