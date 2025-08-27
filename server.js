const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Only require openai if an API key is present. This prevents
// build errors in environments where the module isn't installed.
let OpenAIApi, Configuration;
try {
  ({ Configuration, OpenAIApi } = require('openai'));
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('openai module not installed. API calls will not work.');
}

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Create OpenAI client if API key is provided
let openai;
if (process.env.OPENAI_API_KEY && Configuration && OpenAIApi) {
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  openai = new OpenAIApi(configuration);
}

/**
 * Endpoint for optimizing résumés and cover letters.
 * Expects JSON body: { resume: string, jobDesc?: string, tone?: string, style?: string }
 * Returns JSON: { resume: string, coverLetter: string }
 */
app.post('/api/optimize', async (req, res) => {
  const { resume, jobDesc = '', tone = 'formal', style = 'concise' } = req.body || {};
  if (!resume || typeof resume !== 'string' || resume.trim().length === 0) {
    return res.status(400).json({ error: 'A résumé is required.' });
  }

  // Ensure the OpenAI client is configured
  if (!openai) {
    return res.status(500).json({ error: 'OpenAI is not configured. Please set OPENAI_API_KEY.' });
  }

  // Build the prompt based on user input
  let prompt = '';
  prompt += 'You are an expert resume writer and career coach.\n';
  prompt += `Here is the user\'s current resume:\n${resume}\n\n`;
  if (jobDesc && jobDesc.trim().length > 0) {
    prompt += `They are applying for the following job description:\n${jobDesc}\n\n`;
  } else {
    prompt += 'They are applying for a general role. Please improve the resume for a generic professional position.\n\n';
  }
  prompt += 'Rewrite the resume to better fit the role, using action verbs, quantifying achievements, and integrating keywords from the job posting where appropriate. Do not fabricate experiences or degrees.\n';
  prompt += 'Then draft a one-page cover letter based on the improved resume.\n';
  prompt += `Use a ${tone} tone and a ${style} style.\n\n`;
  prompt += 'Respond with JSON only in the following format:\n';
  prompt += '{"resume": "<improved resume text>", "coverLetter": "<cover letter text>"}';

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful career assistant who improves résumés and writes cover letters.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });
    const responseText = completion.data.choices[0].message.content;
    // Parse the JSON from the model's response
    let parsed;
    try {
      parsed = JSON.parse(responseText.trim());
    } catch (e) {
      // If parsing fails, return entire text
      return res.json({ resume: responseText.trim(), coverLetter: '' });
    }
    return res.json(parsed);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('OpenAI API error:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to generate resume and cover letter.' });
  }
});

// Basic catch-all route
app.get('*', (_req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AI résumé optimizer server listening on port ${PORT}`);
});
