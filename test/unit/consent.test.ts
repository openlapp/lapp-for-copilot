import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  TEST_CONSENT_ENV,
  consentCopy,
  grantConsent,
  isConsentCurrent,
  parseConsentRecord,
  testConsentBypass,
} from "../../src/consent.js";

describe("shared-profile consent", () => {
  it("rejects missing, stale, or malformed records", () => {
    expect(isConsentCurrent(undefined)).toBe(false);
    expect(isConsentCurrent({ version: 0, acceptedAt: "2026-01-01T00:00:00.000Z" })).toBe(false);
    expect(isConsentCurrent({ version: CONSENT_VERSION, acceptedAt: "" })).toBe(false);
    expect(isConsentCurrent({ version: CONSENT_VERSION })).toBe(false);
    expect(isConsentCurrent({ version: CONSENT_VERSION - 1, acceptedAt: "2026-01-01T00:00:00.000Z" })).toBe(false);
  });

  it("accepts a granted record at the required version", () => {
    const granted = grantConsent(() => "2026-08-14T00:00:00.000Z");
    expect(parseConsentRecord(granted)).toEqual(granted);
    expect(isConsentCurrent(granted)).toBe(true);
    expect(isConsentCurrent(granted, CONSENT_VERSION + 1)).toBe(false);
  });

  it("bypasses only the explicit test env flag", () => {
    expect(testConsentBypass({})).toBe(false);
    expect(testConsentBypass({ [TEST_CONSENT_ENV]: "true" })).toBe(false);
    expect(testConsentBypass({ [TEST_CONSENT_ENV]: "1" })).toBe(true);
  });

  it("keeps a real refuse option in both locales", () => {
    const en = consentCopy("en");
    const zh = consentCopy("zh-cn");
    expect(en.accept).not.toBe(en.decline);
    expect(zh.accept).not.toBe(zh.decline);
    expect(en.detail).toMatch(/not per-app isolation/i);
    expect(zh.detail).toMatch(/不是按应用隔离/);
  });
});
