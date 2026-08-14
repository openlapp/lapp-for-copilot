export function formatByteCount(size) {
  return Number(size).toLocaleString("en-US");
}

export function parseVsixReportFacts(markdown) {
  const size = String(markdown).match(/^- Size: ([\d,]+) bytes$/m);
  const hash = String(markdown).match(/^- SHA-512: `([0-9a-f]+)`$/m);
  if (!size || !hash) return undefined;
  return { size: Number(size[1].replaceAll(",", "")), sha512: hash[1] };
}

export function applyVsixReportFacts(markdown, facts) {
  if (!/^- Size: .+$/m.test(markdown) || !/^- SHA-512: `.+`$/m.test(markdown)) {
    throw new Error("BUILD_REPORT.md is missing VSIX Size or SHA-512 lines");
  }
  return String(markdown)
    .replace(/^- Size: .+$/m, `- Size: ${formatByteCount(facts.size)} bytes`)
    .replace(/^- SHA-512: `.+`$/m, `- SHA-512: \`${facts.sha512}\``);
}

export function vsixReportMatches(markdown, actual) {
  const parsed = parseVsixReportFacts(markdown);
  return Boolean(parsed && parsed.size === actual.size && parsed.sha512 === actual.sha512);
}
