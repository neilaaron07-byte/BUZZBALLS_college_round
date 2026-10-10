import { access, readFile } from "node:fs/promises";

const requiredFiles = ["AGENTS.md", "BRAINSTORM.md", "PLAN.md", "STATUS.md", "DECISIONS.md", "README.md"];
const checks = [];
for (const file of requiredFiles) {
  try {
    await access(new URL(`../${file}`, import.meta.url));
    checks.push({ label: `contract:${file}`, pass: true });
  } catch {
    checks.push({ label: `contract:${file}`, pass: false });
  }
}

const plan = await readFile(new URL("../PLAN.md", import.meta.url), "utf8");
const taskCount = (plan.match(/- \[[ x]\] [A-Z]+\d+/g) ?? []).length;
checks.push({ label: "plan:120-or-more-tasks", pass: taskCount >= 120 });

const failures = checks.filter((check) => !check.pass);
console.log(JSON.stringify({ name: "patchwork-judge", tasks: taskCount, checks, pass: failures.length === 0 }, null, 2));
if (failures.length > 0) process.exitCode = 1;
