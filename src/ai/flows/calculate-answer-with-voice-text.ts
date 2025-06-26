'use server';
/**
 * @fileOverview A flow that calculates answers to math questions provided in natural language, either by text or voice.
 *
 * - calculateAnswerWithVoiceText - A function that calculates the answer to a natural language math question.
 * - CalculateAnswerInput - The input type for the calculateAnswerWithVoiceText function.
 * - CalculateAnswerOutput - The return type for the calculateAnswerWithVoiceText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateAnswerInputSchema = z.object({
  question: z
    .string()
    .describe('The math question in natural language, provided either by text or voice.'),
});
export type CalculateAnswerInput = z.infer<typeof CalculateAnswerInputSchema>;

const CalculateAnswerOutputSchema = z.object({
  answer: z.string().describe('The calculated answer to the question.'),
});
export type CalculateAnswerOutput = z.infer<typeof CalculateAnswerOutputSchema>;

export async function calculateAnswerWithVoiceText(input: CalculateAnswerInput): Promise<CalculateAnswerOutput> {
  return calculateAnswerWithVoiceTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateAnswerWithVoiceTextPrompt',
  input: {schema: CalculateAnswerInputSchema},
  output: {schema: CalculateAnswerOutputSchema},
  prompt: `You are a calculator that can answer math questions in natural language.

  Question: {{{question}}}
  Answer: `,
});

const calculateAnswerWithVoiceTextFlow = ai.defineFlow(
  {
    name: 'calculateAnswerWithVoiceTextFlow',
    inputSchema: CalculateAnswerInputSchema,
    outputSchema: CalculateAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
