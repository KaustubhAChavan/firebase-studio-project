'use server';

/**
 * @fileOverview Generates a strong password suggestion based on user-defined complexity requirements.
 *
 * - suggestStrongPassword - A function that generates a strong password suggestion.
 * - SuggestStrongPasswordInput - The input type for the suggestStrongPassword function.
 * - SuggestStrongPasswordOutput - The return type for the suggestStrongPassword function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestStrongPasswordInputSchema = z.object({
  minLength: z.number().describe('Minimum length of the password.'),
  requireNumbers: z.boolean().describe('Whether the password should contain numbers.'),
  requireSymbols: z.boolean().describe('Whether the password should contain symbols.'),
});
export type SuggestStrongPasswordInput = z.infer<typeof SuggestStrongPasswordInputSchema>;

const SuggestStrongPasswordOutputSchema = z.object({
  password: z.string().describe('A strong password suggestion.'),
});
export type SuggestStrongPasswordOutput = z.infer<typeof SuggestStrongPasswordOutputSchema>;

export async function suggestStrongPassword(input: SuggestStrongPasswordInput): Promise<SuggestStrongPasswordOutput> {
  return suggestStrongPasswordFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestStrongPasswordPrompt',
  input: {schema: SuggestStrongPasswordInputSchema},
  output: {schema: SuggestStrongPasswordOutputSchema},
  prompt: `You are a password expert who can generate strong passwords.

  Generate a strong password based on the following criteria:

  - Minimum length: {{minLength}}
  - Must contain numbers: {{requireNumbers}}
  - Must contain symbols: {{requireSymbols}}
  `,
});

const suggestStrongPasswordFlow = ai.defineFlow(
  {
    name: 'suggestStrongPasswordFlow',
    inputSchema: SuggestStrongPasswordInputSchema,
    outputSchema: SuggestStrongPasswordOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
