import type { MetadataRoute } from "next";
import { famliBrand, famliColor } from "@/lib/brand/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: famliBrand.name,
    short_name: famliBrand.name,
    description: famliBrand.metadata.description,
    start_url: "/vandaag",
    display: "standalone",
    background_color: famliColor.bg,
    theme_color: famliColor.blue,
    icons: [
      {
        src: "/famli-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/famli-icon-dark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/famli-icon-mono.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "monochrome",
      },
    ],
  };
}
