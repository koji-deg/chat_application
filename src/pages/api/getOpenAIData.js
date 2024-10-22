// pages/api/getOpenAIData.js

export default async function handler(req, res) {
  const openAiKey = process.env.OPEN_AI_KEY;

  if (!openAiKey) {
    return res.status(500).json({ error: "API�L�[��������܂���" });
  }

  const response = await fetch('https://api.openai.com/v1/your-endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: req.body }), // �K�v�ȃ��N�G�X�g�f�[�^�𑗐M
  });

  const data = await response.json();

  res.status(200).json(data); // �N���C�A���g���Ƀ��X�|���X��Ԃ�
}