export function GET() {
  return new Response("Famli beheer is bereikbaar.", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
