async function callOpenRouter(messages, maxTokens = 2000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY environment variable is not configured.');
  const models = ['google/gemma-4-31b-it', 'google/gemma-4-31b-it:free', 'google/gemini-2.5-flash'];

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sawan-music.vercel.app',
          'X-Title': 'Sawan Music'
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages })
      });
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return { content, modelUsed: model };
      }
    } catch {}
  }
  throw new Error('OpenRouter API call failed.');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      prompt = '', title = 'AI Generated Track', genre = 'Bollywood Romance',
      mood = 'Soulful & Passionate', lyricsPrompt = '', language = 'Hindi & English'
    } = body;

    const systemPrompt = `You are a world-class Bollywood AI lyricist and music composer.
Generate poetic song lyrics and musical direction based on the prompt.
Return ONLY a valid JSON object matching this structure:
{
  "title": "${title}",
  "titleDevanagari": "देवनागरी शीर्षक",
  "genre": "${genre}",
  "mood": "${mood}",
  "keySignature": "D minor",
  "bpm": 78,
  "artistStyle": "In the style of Arijit Singh & Shreya Ghoshal",
  "lyricsDevanagari": "पूर्ण हिंदी देवनागरी पंक्तियाँ (मुखड़ा + अंतरा + कोरस)",
  "lyricsRomanized": "Full Hinglish transliterated lyrics",
  "lyricsEnglish": "Full English translation line by line",
  "compositionNotes": "Musical arrangement guidance (instruments, tempo, rhythm)"
}`;

    const userMessage = `Prompt: "${prompt}". Mood: ${mood}. Genre: ${genre}. Language: ${language}. Reference lyrics: "${lyricsPrompt.slice(0, 200)}"`;

    const { content, modelUsed } = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], 2000);

    let parsed = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {}

    const lyricsText = parsed?.lyricsDevanagari || parsed?.lyricsRomanized || content;

    return res.status(200).json({
      success: true,
      modelUsed,
      title: parsed?.title || title,
      titleDevanagari: parsed?.titleDevanagari || 'एआई गीत निष्पादन',
      genre: parsed?.genre || genre,
      mood: parsed?.mood || mood,
      bpm: parsed?.bpm || 78,
      keySignature: parsed?.keySignature || 'D minor',
      artistStyle: parsed?.artistStyle || 'Sawan AI Lyricist',
      generatedLyrics: lyricsText,
      lyricsRomanized: parsed?.lyricsRomanized || '',
      lyricsEnglish: parsed?.lyricsEnglish || '',
      compositionNotes: parsed?.compositionNotes || 'Acoustic guitar arpeggios, bansuri flute, and warm tabla rhythm.'
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to generate AI lyrics.' });
  }
}
