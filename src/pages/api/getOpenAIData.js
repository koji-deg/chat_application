// pages/api/getOpenAIData.js

export default async function handler(req, res) {
  const openAiKey = process.env.OPEN_AI_KEY;

  if (!openAiKey) {
    return res.status(500).json({ error: "APIキーが見つかりません" });
  }

  const response = await fetch('https://api.openai.com/v1/your-endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: req.body }), // 必要なリクエストデータを送信
  });

  const data = await response.json();

  res.status(200).json(data); // クライアント側にレスポンスを返す
}