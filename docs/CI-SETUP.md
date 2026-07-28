# CI/CD setup — running against a local-only app

Your Vendure app (storefront on `localhost:3001`, server on `localhost:3000`)
only exists on your Mac. GitHub's normal CI runners are cloud VMs with no
route to your machine, so a normal Actions setup can never reach it.

The fix: install a small **self-hosted runner** — GitHub's own agent — on
your Mac. When the workflow runs, GitHub tells your machine "run this job,"
and your machine runs it locally, where `localhost` is real. This is the
standard solution for testing anything that isn't publicly deployed.

## 1. Register the runner

1. Open your repo on GitHub → **Settings** → **Actions** → **Runners** →
   **New self-hosted runner**.
2. Choose **macOS**. GitHub will show you a set of terminal commands
   specific to your repo (they include a one-time registration token, so
   copy them from the page rather than from here).
3. Run those commands in a **Terminal** window on your Mac, in whatever
   folder you'd like the runner installed (e.g. `~/actions-runner`). It'll
   look roughly like:

   ```bash
   mkdir ~/actions-runner && cd ~/actions-runner
   curl -o actions-runner-osx.tar.gz -L <url-from-github>
   tar xzf actions-runner-osx.tar.gz
   ./config.sh --url https://github.com/<you>/playwright-vendure-framework --token <token-from-github>
   ```

   Accept the defaults when it asks for a runner name/labels, unless you
   want to customize them.

## 2. Run it as a background service (recommended)

So the runner is always available without you having to manually start it:

```bash
./svc.sh install
./svc.sh start
```

Check **Settings → Actions → Runners** on GitHub — you should see it listed
as "Idle" with a green dot. If you'd rather run it manually while you're
working, `./run.sh` in that same folder works too, but it stops as soon as
you close the terminal.

## 3. Before triggering a run

Your local Vendure app has to actually be running (storefront + server),
same as when you run tests locally with `npm test`. CI doesn't start it for
you — it just runs the same test suite you already run locally, on the
same machine.

## 4. Optional: configure the URLs/credentials as repo settings

By default the workflow falls back to `localhost:3001` / `localhost:3000`,
matching `.env.example`. If you ever run on different ports, set these in
**Settings → Secrets and variables → Actions**:

- **Variables**: `STOREFRONT_BASE_URL`, `ADMIN_BASE_URL`
- **Secrets**: `API_USERNAME`, `API_PASSWORD` (only needed for the
  authenticated Shop API tests — they skip automatically if unset)

## 5. Trigger a run

- Automatically: push to `main`.
- Manually: **Actions** tab → **Playwright Tests** → **Run workflow**.

Results (HTML report, traces/screenshots on failure) are attached to the
run under **Artifacts** — download and open `playwright-report/index.html`
locally, or run `npm run report` after downloading.

## Why `pull_request` isn't a trigger

A self-hosted runner executes workflow code directly on your machine.
If this workflow triggered on `pull_request`, anyone who opened a PR against
your repo could get their code to run on your Mac. The workflow intentionally
only triggers on pushes to `main` (which only you can do) and manual runs.
Don't add a `pull_request` trigger to this workflow unless you've read up on
[self-hosted runner security](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/self-hosted-runner-security)
and are comfortable with the tradeoffs.
