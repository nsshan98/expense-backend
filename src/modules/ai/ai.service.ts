import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        }
    }

    async predictCategory(
        transactionName: string,
        categories: { id: string; name: string }[],
        customApiKey?: string,
    ): Promise<string | null> {
        let model = this.model;

        if (customApiKey) {
            const genAI = new GoogleGenerativeAI(customApiKey);
            model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        }

        if (!model) {
            return null;
        }

        if (!categories || categories.length === 0) {
            return null;
        }

        const categoryNames = categories.map((c) => c.name).join(', ');
        const prompt = `
      You are a financial classification assistant.
      I have a list of expense categories: [${categoryNames}].
      The user created a transaction with the description: "${transactionName}".
      
      Task:
      - Analyze the description and identify the single best matching category from the provided list.
      - If the description refers to something synonymous or related (e.g., "Pauruti" -> "Food", "Rickshaw" -> "Transport"), map it.
      - If there is NO clear match or the description is ambiguous, return "null".
      - Return ONLY the exact category name as it appears in the list, or "null". Do not add any explanation or punctuation.
    `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();

            // Cleanup cleanup
            text = text.replace(/['"]/g, '').trim();

            if (text.toLowerCase() === 'null') {
                return null;
            }

            // Verify the returned text matches a real category
            const matchedCategory = categories.find(
                (c) => c.name.toLowerCase() === text.toLowerCase(),
            );

            return matchedCategory ? matchedCategory.id : null;
        } catch (error) {
            this.logger.error('Error generating AI prediction:', error);
            return null;
        }
    }
}
