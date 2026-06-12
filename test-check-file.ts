import fetch from 'node-fetch';

async function test() {
  const checkRes = await fetch('http://localhost:3000/api/rag/check-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "hello" })
  });
  console.log(checkRes.status);
  console.log(await checkRes.text());
}
test();
