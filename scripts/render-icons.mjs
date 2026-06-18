import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { Resvg } from "@resvg/resvg-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandDir = join(__dirname, "../assets/brand");
const iconsDir = join(__dirname, "../assets/icons");
const svg = readFileSync(join(brandDir, "app_icon.svg"), "utf8");

function renderPng(size, outPath) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`wrote ${outPath} (${size}px)`);
}

copyFileSync(join(brandDir, "app_icon.svg"), join(iconsDir, "logo-mark.svg"));
copyFileSync(join(brandDir, "app_icon.svg"), join(iconsDir, "favicon.svg"));

renderPng(32, join(iconsDir, "favicon-32.png"));
renderPng(192, join(iconsDir, "favicon-192.png"));
renderPng(180, join(iconsDir, "apple-touch-icon.png"));

renderPng(512, join(brandDir, "app_icon.png"));
renderPng(512, join(brandDir, "app_icon_512.png"));
renderPng(1024, join(brandDir, "app_icon_1024.png"));
