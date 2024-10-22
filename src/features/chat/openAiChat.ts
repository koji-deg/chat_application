import { OpenAI } from "openai";
import { Message } from "../messages/messages";
import { ChatCompletionMessageParam } from "openai/resources";

// サーバーサイドでAPIキーを取得する関数（SSR）
export async function getServerSideProps(context: any) {
  const openAiKey = process.env.OPEN_AI_KEY;

  if (!openAiKey) {
    return {
      props: {
        error: "APIキーが見つかりません",
      },
    };
  }

  // SSRからクライアント側に渡すpropsを返す
  return {
    props: {
      openAiKey,
    },
  };
}

// ChatResponse関数（クライアントにはAPIキーを渡さない）
export async function getOpenAIChatResponse(messages: Message[], model: string, openAiKey: string) {
  if (!openAiKey) {
    throw new Error("Invalid API Key");
  }

  const openai = new OpenAI({
    apiKey: openAiKey,
  });

  const data = await openai.chat.completions.create({
    model: model,
    messages: messages as ChatCompletionMessageParam[],
  });

  const [aiRes] = data.choices;
  const message = aiRes.message?.content || "回答生成時にエラーが発生しました。";

  return { message: message };
}

// Stream API関数（クライアントにはAPIキーを渡さない）
export async function getOpenAIChatResponseStream(messages: Message[], model: string, openAiKey: string) {
  if (!openAiKey) {
    throw new Error("Invalid API Key");
  }

  const openai = new OpenAI({
    apiKey: openAiKey,
  });

  const stream = await openai.chat.completions.create({
    model: model,
    messages: messages as ChatCompletionMessageParam[],
    stream: true,
    max_tokens: 200,
  });

  const res = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      try {
        for await (const chunk of stream) {
          const messagePiece = chunk.choices[0].delta.content;
          if (!!messagePiece) {
            controller.enqueue(messagePiece);
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    }
  });

  return res;
}
