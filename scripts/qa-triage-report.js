#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = process.cwd();
const testResultsDir = path.join(rootDir, 'test-results');
const reportDir = path.join(rootDir, 'reports', 'agent-failure-fixes');
const reportPath = path.join(reportDir, 'qa-triage-report.md');
const htmlReportPath = path.join(reportDir, 'index.html');

function walkFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }

    return [fullPath];
  });
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function firstMatch(text, regex, fallback = 'Not found in Playwright error context') {
  const match = text.match(regex);
  return match?.[1]?.trim() ?? fallback;
}

function normalizeAffectedFile(filePath) {
  if (filePath.startsWith('.features-gen/storefront/')) {
    return filePath
      .replace('.features-gen/storefront/', '')
      .replace('.feature.spec.js', '.feature');
  }

  if (filePath.startsWith('.features-gen/api/')) {
    return filePath
      .replace('.features-gen/api/', '')
      .replace('.feature.spec.js', '.feature');
  }

  if (filePath.endsWith('.feature.spec.js')) {
    return filePath.replace('.feature.spec.js', '.feature');
  }

  return filePath;
}

function extractError(text) {
  const fencedError = text.match(/# Error details\s*```([\s\S]*?)```/);

  if (fencedError?.[1]) {
    return fencedError[1].trim();
  }

  return firstMatch(text, /# Error details\s*([\s\S]*?)(?:\n# |\n```|$)/);
}

function extractAffectedFiles(text) {
  const patterns = [
    /(\.features-gen\/[\w./-]+\.feature\.spec\.js)/g,
    /((?:api|features|fixtures|pages|steps|utils)\/[\w./-]+\.(?:feature|ts|js|json))/g,
    /(\.github\/workflows\/[\w./-]+\.ya?ml)/g,
    /\b(playwright\.config\.ts|package\.json|tsconfig\.json|eslint\.config\.mjs)\b/g,
  ];

  return unique(
    patterns.flatMap((pattern) =>
      [...text.matchAll(pattern)].map((match) => normalizeAffectedFile(match[1])),
    ),
  );
}

function classifyFailure(errorText) {
  const text = errorText.toLowerCase();

  if (
    text.includes('econnrefused') ||
    text.includes('net::err') ||
    text.includes('target page, context or browser has been closed') ||
    text.includes('runner') ||
    text.includes('localhost')
  ) {
    return 'Environment/CI issue';
  }

  if (
    text.includes('invalid_credentials') ||
    text.includes('api_username') ||
    text.includes('api_password') ||
    text.includes('not configured')
  ) {
    return 'Test data/config issue';
  }

  if (
    text.includes('500') ||
    text.includes('internal server error') ||
    text.includes('graphql error') ||
    text.includes('errorresult')
  ) {
    return 'Application/API issue';
  }

  if (
    text.includes('timeout') ||
    text.includes('locator') ||
    text.includes('strict mode violation') ||
    text.includes('tobevisible') ||
    text.includes('tohavetext') ||
    text.includes('tohaveurl') ||
    text.includes('waiting for')
  ) {
    return 'Test automation issue';
  }

  return 'Needs more evidence';
}

function possibleFixes(classification, errorText) {
  const text = errorText.toLowerCase();

  if (classification === 'Environment/CI issue') {
    return [
      'Check that the local Vendure storefront and Shop API are already running before CI starts.',
      'Confirm `STOREFRONT_BASE_URL` and Shop API URL point to the correct local ports.',
      'Rerun once after confirming the self-hosted runner machine is healthy.',
    ];
  }

  if (classification === 'Test data/config issue') {
    return [
      'Check `.env` or GitHub Actions variables/secrets used by the scenario.',
      'Confirm the test account/product/order data exists in the local Vendure database.',
      'Keep optional credential-based tests skipped when safe credentials are not configured.',
    ];
  }

  if (classification === 'Application/API issue') {
    return [
      'Check the Vendure server logs for the same timestamp as the failing test.',
      'Confirm the API mutation/query is valid for the current Vendure schema and test data.',
      'Do not weaken assertions until the API response proves the application behaviour is correct.',
    ];
  }

  if (text.includes('timeout') || text.includes('waiting for')) {
    return [
      'Wait for the real user-visible state instead of adding a fixed timeout.',
      'Check whether the locator is too broad, too narrow, or different on mobile.',
      'Rerun the affected project and the related journey after changing shared page objects.',
    ];
  }

  if (text.includes('strict mode violation') || text.includes('locator')) {
    return [
      'Make the locator more specific using role, accessible name, or a nearby parent section.',
      'Avoid matching hidden duplicate elements unless the page intentionally renders both desktop and mobile views.',
      'Add an assertion that proves the correct element was targeted.',
    ];
  }

  return [
    'Open the Playwright trace and screenshot before changing the test.',
    'Compare the failing scenario with the related feature, step, fixture, helper, and page object files.',
    'If the cause is still unclear, rerun the affected project with trace enabled.',
  ];
}

function testsToRun(affectedFiles, text) {
  const filesText = affectedFiles.join(' ');
  const lowerText = `${filesText} ${text}`.toLowerCase();
  const commands = new Set(['npm run lint', 'npx tsc --noEmit', 'npm run format:check']);

  if (lowerText.includes('api/storefront')) {
    commands.add('npm run test:api');
  }

  if (
    lowerText.includes('pages/storefront') ||
    lowerText.includes('steps/storefront') ||
    lowerText.includes('features/storefront') ||
    lowerText.includes('fixtures/storefront') ||
    lowerText.includes('chromium')
  ) {
    commands.add('npm run test:ui');
  }

  if (lowerText.includes('mobile') || lowerText.includes('mobile-chrome')) {
    commands.add('npm run test:mobile');
  }

  if (
    lowerText.includes('playwright.config') ||
    lowerText.includes('package.json') ||
    lowerText.includes('.github/workflows')
  ) {
    commands.add('npm test');
  }

  if (commands.size === 3) {
    commands.add('npm test');
  }

  return [...commands];
}

function listAttachments(errorFile) {
  const directory = path.dirname(errorFile);
  const files = fs.existsSync(directory) ? fs.readdirSync(directory) : [];

  return files
    .filter((file) => /\.(png|webm|zip)$/i.test(file))
    .map((file) => relativePath(path.join(directory, file)));
}

function formatList(values) {
  if (!values.length) {
    return '- None found in the failure context.';
  }

  return values.map((value) => `- ${value}`).join('\n');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const html = [];
  let inCodeBlock = false;
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push('</code></pre>');
        inCodeBlock = false;
      } else {
        if (inList) {
          html.push('</ul>');
          inList = false;
        }
        html.push('<pre><code>');
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html.push(escapeHtml(line));
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      html.push('</ul>');
      inList = false;
    }

    if (line.startsWith('# ')) {
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.trim()) {
      html.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  if (inList) {
    html.push('</ul>');
  }

  if (inCodeBlock) {
    html.push('</code></pre>');
  }

  return html.join('\n');
}

function buildHtmlReport(markdown) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>QA Failure Triage Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f8fa;
        --panel: #ffffff;
        --text: #17202a;
        --muted: #5f6c7b;
        --border: #d8dee8;
        --accent: #0f766e;
        --code-bg: #101828;
        --code-text: #e6edf7;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        line-height: 1.55;
      }

      main {
        width: min(1080px, calc(100% - 32px));
        margin: 32px auto;
        padding: 32px;
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
      }

      h1,
      h2,
      h3 {
        line-height: 1.25;
        margin: 0 0 12px;
      }

      h1 {
        font-size: 32px;
        border-bottom: 2px solid var(--accent);
        padding-bottom: 12px;
      }

      h2 {
        margin-top: 32px;
        font-size: 22px;
      }

      h3 {
        margin-top: 22px;
        color: var(--accent);
        font-size: 16px;
      }

      p {
        color: var(--muted);
        margin: 0 0 12px;
      }

      ul {
        margin: 0 0 14px;
        padding-left: 24px;
      }

      li {
        margin: 4px 0;
      }

      pre {
        overflow-x: auto;
        background: var(--code-bg);
        color: var(--code-text);
        border-radius: 8px;
        padding: 16px;
      }

      code {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main>
${markdownToHtml(markdown)}
    </main>
  </body>
</html>
`;
}

function buildFailureSection(errorFile, index) {
  const text = fs.readFileSync(errorFile, 'utf8');
  const scenarioName = firstMatch(text, /- Name:\s*(.+)/);
  const location = firstMatch(text, /- Location:\s*(.+)/);
  const error = extractError(text);
  const classification = classifyFailure(error);
  const affectedFiles = extractAffectedFiles(text);
  const attachments = listAttachments(errorFile);
  const fixIdeas = possibleFixes(classification, error);
  const rerunCommands = testsToRun(affectedFiles, `${scenarioName} ${location} ${error}`);

  return `## Failure ${index}: ${scenarioName}

### Where it failed
- Location: ${location}
- Error context: ${relativePath(errorFile)}

### What failed
\`\`\`text
${error}
\`\`\`

### Why it likely failed
${classification}

### Possible fixes
${formatList(fixIdeas)}

### Affected files
${formatList(affectedFiles)}

### Evidence to review
${formatList(attachments)}

### Tests/checks to run before accepting a fix
${formatList(rerunCommands)}

### Commit recommendation
- Do not commit a fix until the affected checks above pass and the report is reviewed.
`;
}

function buildReport() {
  const errorFiles = walkFiles(testResultsDir).filter(
    (file) => path.basename(file) === 'error-context.md',
  );
  const generatedAt = new Date().toISOString();

  if (!errorFiles.length) {
    return `# QA Failure Triage Report

Generated: ${generatedAt}

No Playwright failure contexts were found in \`test-results/\`.

## What this means

- The last local run may not have failed.
- The failure artifacts may have been cleaned up.
- In CI, download the \`test-results\` or \`qa-triage-report\` artifact from the failed run.

## Next step

Run the failing command again, then run:

\`\`\`bash
npm run triage:report
\`\`\`
`;
  }

  return `# QA Failure Triage Report

Generated: ${generatedAt}

Found ${errorFiles.length} Playwright failure context file(s).

${errorFiles.map((errorFile, index) => buildFailureSection(errorFile, index + 1)).join('\n')}
`;
}

const markdownReport = buildReport();

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, markdownReport);
fs.writeFileSync(htmlReportPath, buildHtmlReport(markdownReport));
console.log(`QA triage report written to ${relativePath(reportPath)}`);
console.log(`QA triage HTML report written to ${relativePath(htmlReportPath)}`);
