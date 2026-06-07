import "server-only";

/**
 * GitHub plumbing for the dev→prod promotion console.
 *
 * The "push schema to prod" button fires the `prod-deploy.yml`
 * workflow_dispatch on the iOS repo (which runs `supabase db push` +
 * `functions deploy` against prod), then we poll the resulting run for
 * status. We also read the single-source hold-list file so the console
 * can flag migrations that are deliberately withheld from prod.
 *
 * Server-only. Needs `GITHUB_DISPATCH_TOKEN` (fine-grained PAT scoped to
 * the iOS repo with Actions: read+write, Contents: read). Never NEXT_PUBLIC.
 */

const REPO = process.env.GITHUB_IOS_REPO ?? "Pinehollow-Studios/Vestige-ios";
const WORKFLOW = process.env.GITHUB_PROD_DEPLOY_WORKFLOW ?? "prod-deploy.yml";
const REF = process.env.GITHUB_IOS_REF ?? "main";
const TOKEN = process.env.GITHUB_DISPATCH_TOKEN;
const API = "https://api.github.com";

export function githubConfigured(): boolean {
  return Boolean(TOKEN);
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export type WorkflowRun = {
  id: number;
  status: string | null; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | null
  htmlUrl: string;
  createdAt: string;
};

/** Fire prod-deploy.yml. Returns the dispatch time so the caller can find
 *  the run it just created (the dispatch API itself returns no run id). */
export async function dispatchProdDeploy(opts: {
  migrations: boolean;
  functions: boolean;
  reason?: string;
}): Promise<void> {
  if (!TOKEN) throw new Error("GITHUB_DISPATCH_TOKEN is not set.");
  const res = await fetch(
    `${API}/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        ref: REF,
        inputs: {
          migrations: String(opts.migrations),
          functions: String(opts.functions),
          reason: opts.reason ?? "dashboard push",
        },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`workflow_dispatch failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

/** Most recent run of prod-deploy.yml (to surface status after a dispatch). */
export async function latestProdDeployRun(): Promise<WorkflowRun | null> {
  if (!TOKEN) return null;
  const res = await fetch(
    `${API}/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { workflow_runs?: Array<Record<string, unknown>> };
  const run = data.workflow_runs?.[0];
  if (!run) return null;
  return {
    id: run.id as number,
    status: (run.status as string) ?? null,
    conclusion: (run.conclusion as string) ?? null,
    htmlUrl: (run.html_url as string) ?? "",
    createdAt: (run.created_at as string) ?? "",
  };
}

/** Read the prod-migration hold-list (single source of truth) from the repo.
 *  Returns the set of held migration versions. Empty set on any failure
 *  (the workflow still enforces the hold server-side; this is for display). */
export async function fetchProdMigrationHold(): Promise<Set<string>> {
  if (!TOKEN) return new Set();
  const res = await fetch(
    `${API}/repos/${REPO}/contents/supabase/prod-migration-hold.txt?ref=${REF}`,
    {
      headers: { ...headers(), Accept: "application/vnd.github.raw" },
      // The hold-list rarely changes; cache 5 min so the per-page sync chip
      // doesn't hit the GitHub API on every navigation.
      next: { revalidate: 300 },
    },
  );
  if (!res.ok) return new Set();
  const text = await res.text();
  const held = new Set<string>();
  for (const line of text.split("\n")) {
    const v = line.replace(/#.*/, "").trim();
    if (v) held.add(v);
  }
  return held;
}
