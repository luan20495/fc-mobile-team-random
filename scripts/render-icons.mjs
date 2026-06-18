import { readFileSync, writeFileSync } from "fs";
import { Resvg } from "@resvg/resvg-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "../assets/icons");
const svg = readFileSync(join(iconsDir, "logo-mark.svg"), "utf8");

function renderPng(size, out) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  });
  writeFileSync(join(iconsDir, out), resvg.render().asPng());
  console.log(`wrote ${out} (${size}px)`);
}

renderPng(32, "favicon-32.png");
renderPng(192, "favicon-192.png");
renderPng(180, "apple-touch-icon.png");
