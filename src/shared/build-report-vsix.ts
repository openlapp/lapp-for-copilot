export interface VsixReportFacts {
  size: number;
  sha512: string;
}

export function formatByteCount(size: number): string {
  return size.toLocaleString("en-US");
}

export function parseVsixReportFacts(markdown: string): VsixReportFacts | undefined {
  const size = markdown.match(/^- Size: ([\d,]+) bytes$/m);
  const hash = markdown.match(/^- SHA-512: `([0-9a-f]+)`$/m);
  const bytes = size?.[1];
  const sha512 = hash?.[1];
  if (!bytes || !sha512) return undefined;
  return { size: Number(bytes.replaceAll(",", "")), sha512 };
}

export function applyVsixReportFacts(markdown: string, facts: VsixReportFacts): string {
  if (!/^- Size: .+$/m.test(markdown) || !/^- SHA-512: `.+`$/m.test(markdown)) {
    throw new Error("BUILD_REPORT.md is missing VSIX Size or SHA-512 lines");
  }
  return markdown
    .replace(/^- Size: .+$/m, `- Size: ${formatByteCount(facts.size)} bytes`)
    .replace(/^- SHA-512: `.+`$/m, `- SHA-512: \`${facts.sha512}\``);
}

export function vsixReportMatches(markdown: string, actual: VsixReportFacts): boolean {
  const parsed = parseVsixReportFacts(markdown);
  return Boolean(parsed && parsed.size === actual.size && parsed.sha512 === actual.sha512);
}
