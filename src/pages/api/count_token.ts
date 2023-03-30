import type { APIRoute } from "astro";
import { encode } from "gpt-3-encoder";

export const get_size = (s: string) => {
  return encode(s).length;
};

export const post: APIRoute = async (context) => {
  const body = await context.request.json();
  return new Response(JSON.stringify({ size: get_size(body.text) }));
};
