
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k] = v.join('=').trim();
  return acc;
}, {});

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004', apiVersion: 'v1' });
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const res = await embeddingModel.embedContent({ content: { role: 'user', parts: [{ text: 'requisitos de credencial' }] }, outputDimensionality: 768 });
  const emb = res.embedding.values;
  const { data, error } = await supabase.rpc('buscar_documentos', { query_embedding: emb, match_threshold: 0.35, match_count: 4 });
  console.log('Result:', data?.length);
  if (data) data.forEach(d => console.log(d.fuente, d.similarity));
}
test();

