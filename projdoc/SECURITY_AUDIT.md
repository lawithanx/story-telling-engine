# Security Audit: StoryEngine

**Date:** 2026-02-19
**Auditor:** Antigravity
**Scope:** Client-side Security, Input Sanitization, Data Integrity

## 1. Overview
StoryEngine is a client-side web application that renders narrative content from JSON files. It runs in a static environment (Python `http.server` or similar) with no dedicated backend logic handling user credentials or sensitive server-side data.

## 2. Security Mechanisms

### A. Input Sanitization
**Component:** `scripts/engine.js` -> `checkSystemIntegrity(input)`
**Mechanism:** Regex-based filtering of terminal input.
**Status:** ✅ Active
**Details:**
The system blocks the following patterns to prevent basic XSS or unauthorized execution:
- `<script>`, `</script>`
- `onerror`, `onload`
- `eval(`, `alert(`
- `document.`, `window.`
- **Action:** Terminal inputs matching these patterns are rejected with a "Security Violation" message.

### B. Content Rendering
**Component:** `scripts/engine.js` -> `processCommand` & `renderStoryv2`
**Mechanism:** 
- Story ID selection is matched against a pre-loaded `library.json` allowlist.
- Users cannot request arbitrary filenames via the terminal; they can only select pre-defined indices.
- `fetch` calls are constructed using trusted IDs from the library, preventing path traversal attacks (e.g., `../../etc/passwd`).

### C. DOM Manipulation
**Status:** ⚠️ Moderate Risk (Mitigated)
**Details:**
- `innerHTML` is used in `renderStoryv2` to inject story content.
- **Risk:** If a malicious JSON file is loaded, it could execute arbitrary JS.
- **Mitigation:** JSON content is assumed to be trusted (authored by Lawithanx). The `checkSystemIntegrity` function only sanitizes *user input*, not *JSON content*.
- **Recommendation:** Maintain strict control over the `data/` directory.

## 3. Vulnerability Assessment

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| V-01 | Low | **XSS via JSON:** Malicious story files could inject scripts. | Acceptable Risk (Content is static/trusted) |
| V-02 | Low | **Path Traversal:** Terminal input is not used directly in file paths. | Mitigated (Indirect selection) |
| V-03 | Info | **Information Disclosure:** Directory/source listing accessible by AI scrapers. | Mitigated (`robots.txt` added to disallow internal paths) |
| V-04 | Info | **Secret Leakage:** Risk of committing sensitive configs. | Mitigated (`.env` added and fully tracked by `.gitignore`) |

## 4. Recommendations
1. **Production Deployment:** Disable directory listing if deploying to a public web server (e.g., Nginx/Apache configuration).
2. **Content Validation:** If community stories are allowed in the future, implement a strict schema validator and HTML sanitizer (e.g., DOMPurify) before injecting content.
3. **CSP:** Add a Content Security Policy (CSP) header to restrict script sources to self.
4. **AI/Bot Control:** The current `robots.txt` limits scraper knowledge intentionally, branding the site as an 'ancient artifact'. Monitor search console to ensure crawlers obey the exclusions.

## 5. Conclusion
The system is secure for its intended use case as a personal portfolio/story engine. Interactive elements are sandboxed via the `checkSystemIntegrity` function, and file access is restricted to the logic within `engine.js`.
