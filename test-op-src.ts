import fs from 'fs';
const content = fs.readFileSync('node_modules/@google/genai/dist/operations.js', 'utf8');
console.log(content.split('\n').slice(60, 100).join('\n'));
