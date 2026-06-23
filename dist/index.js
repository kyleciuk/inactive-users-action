const { Octokit } = require("@octokit/rest");
const fs = require("fs");

const token =
  process.env.GITHUB_TOKEN ||
  process.env.INPUT_TOKEN ||
  process.env.ORG_AUDIT_TOKEN;
const org = process.env.ORG_NAME;
const days = parseInt(process.env.DAYS || "90");

const octokit = new Octokit({ auth: token });

const sinceDate = new Date();
sinceDate.setDate(sinceDate.getDate() - days);

const since = sinceDate.toISOString().split("T")[0];

function initUser(login) {
  return {
    login,
    commits: 0,
    prs: 0,
    prReviews: 0,
    issueComments: 0,
    isActive: false
  };
}

// ✅ fetch org members (single pass)
async function getUsers() {
  const users = {};
  const iterator = octokit.paginate.iterator(
    octokit.orgs.listMembers,
    { org }
  );

  for await (const { data } of iterator) {
    data.forEach(u => {
      users[u.login] = initUser(u.login);
    });
  }

  return users;
}

// ✅ commits (SEARCH API)
async function getCommits(users) {
  const results = await octokit.paginate(
    octokit.search.commits,
    {
      q: `org:${org} committer-date:>=${since}`,
      per_page: 100
    }
  );

  results.forEach(r => {
    if (r.author && users[r.author.login]) {
      users[r.author.login].commits++;
    }
  });
}

// ✅ PRs created
async function getPRs(users) {
  const results = await octokit.paginate(
    octokit.search.issuesAndPullRequests,
    {
      q: `org:${org} type:pr created:>=${since}`,
      per_page: 100
    }
  );

  results.forEach(pr => {
    if (pr.user && users[pr.user.login]) {
      users[pr.user.login].prs++;
    }
  });
}

// ✅ PR reviews (THIS IS THE FIX)
async function getReviews(users) {
  const results = await octokit.paginate(
    octokit.search.issuesAndPullRequests,
    {
      q: `org:${org} is:pr reviewed-by:* updated:>=${since}`,
      per_page: 100
    }
  );

  results.forEach(r => {
    if (r.user && users[r.user.login]) {
      users[r.user.login].prReviews++;
    }
  });
}

// ✅ issue comments
async function getIssueComments(users) {
  const results = await octokit.paginate(
    octokit.search.issuesAndPullRequests,
    {
      q: `org:${org} comments:>0 updated:>=${since}`,
      per_page: 100
    }
  );

  results.forEach(i => {
    if (i.user && users[i.user.login]) {
      users[i.user.login].issueComments++;
    }
  });
}

// ✅ finalize activity
function finalize(users) {
  Object.values(users).forEach(u => {
    const total =
      u.commits +
      u.prs +
      u.prReviews +
      u.issueComments;

    u.isActive = total > 0;
  });
}

// ✅ output
function writeCSV(users) {
  const headers = [
    "login",
    "isActive",
    "commits",
    "prs",
    "prReviews",
    "issueComments"
  ];

  const rows = Object.values(users).map(u =>
    [
      u.login,
      u.isActive,
      u.commits,
      u.prs,
      u.prReviews,
      u.issueComments
    ].join(",")
  );

  fs.writeFileSync(
    "user_activity.csv",
    [headers.join(","), ...rows].join("\n")
  );
}

// ✅ run
async function run() {
  console.log("Fetching users...");
  const users = await getUsers();

  console.log("Fetching commits...");
  await getCommits(users);

  console.log("Fetching PRs...");
  await getPRs(users);

  console.log("Fetching PR reviews...");
  await getReviews(users);

  console.log("Fetching issue comments...");
  await getIssueComments(users);

  finalize(users);
  writeCSV(users);

  console.log("✅ Complete");
}

run();
``
