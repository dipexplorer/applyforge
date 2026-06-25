import { readFile } from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Allow cross-origin requests from the Chrome extension
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req) {
    try {
        const { question } = await req.json();

        if (!question) {
            return new Response(JSON.stringify({ error: 'question is required' }), { status: 400, headers: CORS });
        }

        // Load profile
        const profilePath = path.join(process.cwd(), 'data', 'profile.json');
        const profileRaw = await readFile(profilePath, 'utf8');
        const profile = JSON.parse(profileRaw);

        // Generate answer with Gemini
        const ai = new GoogleGenAI({});

        const prompt = [
            'You are a real human filling out a job application form online.',
            'Write a natural, first-person, conversational answer to the form question below.',
            'Sound authentic and human — not robotic, not a template.',
            'Be specific about your experience when relevant.',
            'Keep your answer under 120 words.',
            'Never lie, never hallucinate experience you do not have.',
            '',
            '== Your Resume / Profile ==',
            JSON.stringify(profile, null, 2),
            '',
            '== Form Question ==',
            question.trim(),
            '',
            'Answer (write ONLY the answer, no preamble):',
        ].join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        const answer = (response.text || '').trim();

        return new Response(JSON.stringify({ answer }), { status: 200, headers: CORS });

    } catch (err) {
        console.error('[Generate API Error]', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
    }
}
