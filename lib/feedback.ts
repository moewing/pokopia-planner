import type { OverrideMap } from "@/lib/data";
import type { Pokemon } from "@/types/pokemon";

const REPO_ISSUES_URL =
  "https://github.com/moewing/pokopia-planner/issues/new";

// GitHub's issue creation URL effectively caps body at ~8 KB (after encoding).
// We leave headroom so title + other params don't push past the limit.
const MAX_BODY_BYTES = 6800;

/**
 * Build a GitHub issue URL with a pre-filled body describing every user
 * override as a diff vs. the shipped data. Returns the URL + the raw body
 * (for clipboard fallback when the body overflows GitHub's URL-length cap).
 */
export function buildFeedbackIssueUrl(
  merged: Pokemon[],
  overrides: OverrideMap,
): { url: string; body: string; bodyTooLong: boolean } {
  const overrideIds = Object.keys(overrides)
    .map((k) => Number(k))
    .filter((id) => !Number.isNaN(id));

  const body = formatBody(merged, overrides, overrideIds);
  const titleCount = overrideIds.length;
  const title = `[Data correction] ${titleCount} 条数据修正`;

  let encodedBody = encodeURIComponent(body);
  const bodyTooLong = encodedBody.length > MAX_BODY_BYTES;

  let finalBody = body;
  if (bodyTooLong) {
    finalBody =
      `本次反馈涉及 ${titleCount} 条数据，完整差异已复制到剪贴板，请直接粘贴到此处。\n\n` +
      `（URL 长度有限，无法在预填时携带完整 JSON。）`;
    encodedBody = encodeURIComponent(finalBody);
  }

  const url = `${REPO_ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodedBody}&labels=${encodeURIComponent("data-correction")}`;

  return { url, body, bodyTooLong };
}

function formatBody(
  merged: Pokemon[],
  overrides: OverrideMap,
  ids: number[],
): string {
  const byId = new Map(merged.map((p) => [p.id, p]));
  const lines: string[] = [];
  lines.push(`> 由 [Pokopia Planner](https://pokopia-planner-three.vercel.app/feedback) 自动生成的数据修正反馈。`);
  lines.push("");
  lines.push(
    `共 **${ids.length}** 条修改。每条下面列出"当前值 → 修改后值"。作者确认后合进 \`data/pokemon.json\`。`,
  );
  lines.push("");

  // We include the final merged value for each field the user touched. The
  // raw patch may be a partial object, but we show the *resulting* pokemon so
  // maintainers can diff against the shipped dataset directly.
  for (const id of ids) {
    const patch = overrides[id] ?? {};
    const merged_p = byId.get(id);
    if (!merged_p) continue;

    lines.push(`### #${String(id).padStart(3, "0")} ${merged_p.name}`);
    lines.push("");

    const fields: Array<[string, unknown]> = Object.entries(patch);
    if (fields.length === 0) {
      lines.push(`（记录存在但未改动？可能可以删除）`);
      lines.push("");
      continue;
    }

    for (const [field, newValue] of fields) {
      lines.push(
        `- \`${field}\`: ${formatFieldValue(newValue)}`,
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    `<details><summary>原始 overrides JSON（技术细节）</summary>\n\n\`\`\`json\n${JSON.stringify(overrides, null, 2)}\n\`\`\`\n\n</details>`,
  );

  return lines.join("\n");
}

function formatFieldValue(v: unknown): string {
  if (v === null) return "`null`";
  if (v === undefined) return "`undefined`";
  if (Array.isArray(v)) {
    if (v.length === 0) return "`[]`";
    return v.map((x) => `\`${String(x)}\``).join(", ");
  }
  if (typeof v === "string") return `\`${v}\``;
  if (typeof v === "number" || typeof v === "boolean")
    return `\`${String(v)}\``;
  return "`" + JSON.stringify(v) + "`";
}
