
# GitHub Inactive Users Audit

## Overview

This repository contains a customized version of the `inactive-users-action` used to generate user activity reports across GitHub organizations.

This implementation has been enhanced to support enterprise-scale environments with large numbers of repositories and API limitations.

---

## Key Enhancements (Custom to This Fork)

- ✅ Repository batching to avoid GitHub API rate limits
- ✅ Error handling for:
  - Empty repositories
  - Repositories returning 404 responses (archived, restricted, or disabled features)
- ✅ Improved stability for large organizations (1000+ repositories)

---

## ⚠️ REQUIRED: Batch Execution

Due to GitHub API limits, this action **must be run in batches**.

The batching configuration is controlled in: **dist/index.js**

### Configuration:

```js
const batchSize = 500;
const batchNumber = 1;
```

***After Each Run — REQUIRED STEP***
You MUST update the batch number before re-running the workflow: 
```js
const batchNumber = X;
```

***Example:***
- Batch 1 → batchNumber = 1
- Batch 2 → batchNumber = 2
- Batch 3 → batchNumber = 3

⚠️ **Important Notes**
- Do NOT change batchSize between runs
- Sorting MUST remain enabled:
```js
repositories.sort((a, b) => a.full_name.localeCompare(b.full_name));
```
- Each run generates a ***partial report***
- All batch outputs must be combined after completion

***Recommended Execution Process***
1. Update batchNumber in dist/index.js
2. Commit the change
3. Run the GitHub Action
4. Download the CSV artifact
5. Repeat for each batch
6. Combine all CSV outputs for full analysis

***Workflow (Usage)***
This fork should be referenced in your workflow like this:
```js
- name: Analyze User Activity
  id: analyze_user_activity
  uses: <your-org-or-username>/inactive-users-action@main
  with:
    token: ${{ secrets.ORG_AUDIT_TOKEN }}
    organization: your-org-name
    activity_days: 90
```

***Output Usage***
Each batch produces:
- A CSV file containing user activity
- Data used for:
  - Identifying inactive users
  - License optimization
  - Governance analysis

***Known Behavior / Limitations***
- Requires manual batching via batchNumber
- Subject to GitHub API rate limits
- Some repositories may be skipped due to:
  - Empty state
  - API restrictions (404 responses)

***Future Improvements (Recommended)***
- Pass batchNumber via workflow inputs (avoid code edits)
- Automate batch execution
- Combine CSV outputs automatically
- Migrate to GitHub App authentication (higher API limits)
- Integrate results into Power BI for reporting

***Summary***
This customized version enables reliable, scalable user activity auditing across large GitHub Enterprise environments while working within API constraints.
Proper use of batching is required to ensure successful execution.

---

# inactive-users-action

A GitHub Action that can be run against a GitHub Organization to generate a report on user activity for a given time 
period. This can be useful in detecting inactive users so that licenses can be reclaimed.

## Processing

This action will perform a lot of API requests against your organization to generate the necessary data for identifying
user activity. To be compliant with GitHub best practices, this action will perform these API calls sequentially to 
avoid triggering anti-abuse restrictions on the user/bot account owner of the token.

As a guide, in testing this action takes about 15 minutes to run on an organization which contains ~410 repositories.


## Parameters

* `token`: `required` A GitHub Personal Access Token for a user that has access to the repositories and organization, specific permissions: `read:org`, `repo`, `user:email` 
* `organization`: `required` The name of the organization to process
* `since`: A date to be used to collect information from in the form YYYY-MM-DD, if this is specified, `activity_days` is ignored
* `activity_days`: The number of days back from now to collect information from, defaults to `30` days
* `outputDir`: The output directory to store the report files in.
* `octokit_max_retries`: The number of retries before failing with the octokit REST API calls, defaults to `15`.

## Outputs

The GitHub Action will register the following outputs that can be referenced in other steps:

* `report_csv`: The path to the CSV report file that is generated
* `report_json`: The path to the file containing the JSON data used to generate the CSV report


## Examples

Invoke the action step providing the required parameters to analyze user activity over the last 30 days:

```
name: Analyze User Activity
id: analyze_user_activity
uses: peter-murray/inactive-users-action@v1
with:
  token: ${{ secrets.ORGANIZATION_AND_REPO_ACCESS_TOKEN }}
  organization: octodemo
```

Get user activity in the last 90 days for an organization and save the output CSV file as a build artifact:

```
- name: Analyze User Activity
  id: analyze_user_activity
  uses: peter-murray/inactive-users-action@v1
  with:
    token: ${{ secrets.ORGANIZATION_AND_REPO_ACCESS_TOKEN }}
    organization: octodemo
    activity_days: 90

- name: Save User Activity Report
  uses: actions/upload-artifact@v2
  with:
    name: reports
    path: |
      ${{ steps.analyze_user_activity.outputs.report_csv }}

```
