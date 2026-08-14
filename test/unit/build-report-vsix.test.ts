import { describe, expect, it } from "vitest";
import {
  applyVsixReportFacts,
  parseVsixReportFacts,
  vsixReportMatches,
} from "../../src/shared/build-report-vsix.js";

const sample = `# BUILD_REPORT

## VSIX

- Path: dist-vsix/lapp-for-copilot-0.1.0.vsix
- Size: 1,000 bytes
- SHA-512: \`abc123\`
- yauzl entries: 508
`;

describe("BUILD_REPORT VSIX facts", () => {
  it("rewrites only the size and SHA-512 lines", () => {
    const next = applyVsixReportFacts(sample, { size: 2124041, sha512: "def456" });
    expect(next).toContain("- Size: 2,124,041 bytes");
    expect(next).toContain("- SHA-512: `def456`");
    expect(next).toContain("- Path: dist-vsix/lapp-for-copilot-0.1.0.vsix");
    expect(next).toContain("- yauzl entries: 508");
    expect(parseVsixReportFacts(next)).toEqual({ size: 2124041, sha512: "def456" });
  });

  it("matches only when size and digest both agree", () => {
    const facts = { size: 1000, sha512: "abc123" };
    expect(vsixReportMatches(sample, facts)).toBe(true);
    expect(vsixReportMatches(sample, { ...facts, size: 1001 })).toBe(false);
    expect(vsixReportMatches(sample, { ...facts, sha512: "fff" })).toBe(false);
    expect(vsixReportMatches("# no facts", facts)).toBe(false);
  });

  it("throws when the report is missing the VSIX contract lines", () => {
    expect(() => applyVsixReportFacts("# empty", { size: 1, sha512: "aa" })).toThrow(/missing VSIX Size or SHA-512/);
  });
});
