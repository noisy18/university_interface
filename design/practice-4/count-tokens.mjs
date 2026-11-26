import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const baseline = "8ac1e5134feb3df9f303da1e7340e1309559e6e5";
const site = ["site/styles.css", "site/report.css"];
const practice = ["tokens.css", "components.css", "preview.css"].map(name => "design/practice-4/" + name);
const before = site.map(file => execFileSync("git", ["-C", root, "show", baseline + ":" + file], { encoding: "utf8" })).join("\n");
const after = [...site, ...practice].map(file => readFileSync(new URL(file, new URL("../../", import.meta.url)), "utf8")).join("\n");

function count(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const colors = new Set();
  for (const match of clean.matchAll(/#[\da-f]{3,8}\b(?!\s*\{)|rgba?\([^)]*\)/gi)) {
    let value = match[0].toLowerCase().replace(/\s+/g, "");
    if (/^#[\da-f]{3,4}$/.test(value)) value = "#" + [...value.slice(1)].map(char => char.repeat(2)).join("");
    value = value.replace(/^rgba\((\d+),(\d+),(\d+),([.\d]+)\)$/, (_, r, g, b, a) =>
      "#" + [r, g, b, Math.round(Number(a) * 255)].map(n => Number(n).toString(16).padStart(2, "0")).join(""));
    colors.add(value);
  }
  const spaces = new Set();
  for (const match of clean.matchAll(/(?:^|[;{])\s*(?:--space-[\d]+|(?:margin|padding)(?:-[\w-]+)?|(?:row-|column-)?gap|scroll-margin-top)\s*:\s*([^;}]+)/gm)) {
    for (const value of match[1].matchAll(/(-?[\d.]+)px\b/g)) spaces.add(Number(value[1]));
  }
  return { colors: [...colors].sort(), spaces: [...spaces].sort((a, b) => a - b) };
}

for (const [label, css] of [["Было", before], ["Стало", after]]) {
  const { colors, spaces } = count(css);
  console.log(label, { colorCount: colors.length, colors, spaceCount: spaces.length, spaces });
}
