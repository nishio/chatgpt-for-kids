// #vercel-disable-blocks
import { fetch } from "undici";
// #vercel-end
import { generatePayload, parseOpenAIStream } from "@/utils/openAI";
import type { APIRoute } from "astro";

const apiKey = import.meta.env.OPENAI_API_KEY;
const baseUrl = "https://api.openai.com";

export const post: APIRoute = async (context) => {
  const body = await context.request.json();
  const { messages, mode } = body;
  if (!messages) {
    return new Response(
      JSON.stringify({
        error: {
          message: "No input text.",
        },
      }),
      { status: 400 }
    );
  }

  const initOptions = generatePayload(apiKey, messages, mode);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  const response = (await fetch(
    `${baseUrl}/v1/chat/completions`,
    // @ts-ignore
    initOptions
  ).catch((err: Error) => {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: {
          code: err.name,
          message: err.message,
        },
      }),
      { status: 500 }
    );
  })) as Response;

  return parseOpenAIStream(response) as Response;
};
