export const runtime = 'edge';

export default function handler(): Response {
  return new Response(
    JSON.stringify({ message: 'I AM EDGE', ts: Date.now(), runtime: 'edge' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
