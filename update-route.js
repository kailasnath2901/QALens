const fs = require('fs');

let content = fs.readFileSync('e:/QALens/src/app/api/ai/generate/route.ts', 'utf8');

content = content.replace(/GROK_MODEL/g, 'GROQ_MODEL');
content = content.replace(/"grok-4\.5"/g, '"qwen/qwen3.6-27b"');
content = content.replace(/"grok"/g, '"groq"');
content = content.replace(/tryGrok/g, 'tryGroq');
content = content.replace(/grokKey/g, 'groqKey');
content = content.replace(/Grok/g, 'Groq');
content = content.replace(/isGrokPrioritized/g, 'isGroqPrioritized');
content = content.replace(/api\.x\.ai\/v1/g, 'api.groq.com/openai/v1');

fs.writeFileSync('e:/QALens/src/app/api/ai/generate/route.ts', content);
console.log("Successfully replaced Grok with Groq in route.ts");
