import { NextRequest } from 'next/server';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  const { apiKey, model, mode, question, markdown } = await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenRouter API key is required' }), { status: 400 });
  }
  if (!markdown) {
    return new Response(JSON.stringify({ error: 'No documentation content provided' }), { status: 400 });
  }

  const systemPrompt =
    'You are a documentation expert. You are given scraped documentation content in Markdown format. ' +
    'Answer clearly and concisely based only on the provided documentation. ' +
    'Use Markdown formatting in your response.';

  const userPrompt =
    mode === 'summarize'
      ? `Please provide a comprehensive summary of the following documentation. Cover the main topics, key concepts, and important details:\n\n${markdown}`
      : `Based on the following documentation, answer this question:\n\n**Question:** ${question}\n\n**Documentation:**\n${markdown}`;

  const body = {
    model: model || 'google/gemini-2.0-flash-001',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  const upstream = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://docscraper.ai',
      'X-Title': 'DocScraper AI',
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(JSON.stringify({ error: `OpenRouter error: ${upstream.status} — ${err}` }), {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
