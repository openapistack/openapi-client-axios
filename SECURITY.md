# Security Policy

openapi-client-axios has a single maintainer: me, in my spare time. There is no security team, no bug bounty and no SLA. This policy is honest about what that means, and it tells you what I need from you to fix things quickly anyway.

## Supported versions

| Version | Security fixes |
| --- | --- |
| Latest 7.x release | ✅ Fixes ship as a new 7.x release. |
| Older 7.x releases | ❌ Upgrade to the latest 7.x. Fixes are not backported. |
| 6.x and older | ❌ Unsupported since 7.0.0 (February 2023). |

## Reporting a vulnerability

Please report suspected security vulnerabilities privately. Do not open a public issue, pull request or discussion for an unpatched vulnerability.

The preferred channel is a private vulnerability report through GitHub Security Advisories: [Report a vulnerability](https://github.com/openapistack/openapi-client-axios/security/advisories/new). This keeps the report confidential and lets us work on the fix and the advisory in one place.

If you cannot use GitHub, email **support@openapistack.co** with `SECURITY` in the subject line.

A report I can act on quickly has:

- the version you tested. Ideally the latest 7.x, since nothing else gets fixes;
- which guarantee in the [threat model](docs/threat-model.md#7-what-does-the-library-guarantee) it breaks (P1 to P8, R1 to R3), or why you think the model is missing something;
- a minimal runnable proof of concept: the definition, the `OpenAPIClientAxios` options and the call. `api.getRequestConfigForOperation()` shows the URL and headers a call would produce without sending anything;
- the impact, in a few sentences; and
- whether the issue is public or being exploited.

One issue per report, please. Keep it short: skip CVSS scores and long background sections. A reproducer beats both.

Please avoid including secrets or personal data in the report. If sensitive material is necessary, ask for a secure transfer method first.

## What to expect

I read every report myself, as soon as practical, and I reply when I've looked at it. There is no guaranteed response or remediation deadline. Things move faster when the report is easy to reproduce.

Reports are triaged against the [threat model](docs/threat-model.md). If a report breaks one of its guarantees, I fix it in a private fork, release a new 7.x version and publish a [GitHub Security Advisory](https://github.com/openapistack/openapi-client-axios/security/advisories), crediting you unless you'd rather stay anonymous. I coordinate the disclosure with you where possible. If it lands outside the model, I close it and cite the section that covers it (§10a lists the usual suspects).

Published advisories are listed on the [Security tab](https://github.com/openapistack/openapi-client-axios/security/advisories). Please don't request a CVE for this project from another CNA; talk to me first.

## What counts as a vulnerability?

Short answer: it depends on whether the value could have gone anywhere else.

The full contract lives in [docs/threat-model.md](docs/threat-model.md). This is the summary. Please read it before reporting, it will save us both a round trip.

**The trust boundary is the argument list of an operation call.** `client.op(parameters, data, config)`. The application controls all three by contract, but it forwards values from users and language models, so the library's job is containment: a parameter value lands in the location its operation declares, encoded, and nowhere else. The definition is your configuration, trusted, hardened since 7.9.1 so that a fetched one can't take over the process. Everything else (your axios instance, interceptors, transforms, runners, the `config` argument) is your code.

**What openapi-client-axios guarantees:**

- **Parameter containment (P1).** Path values are percent-encoded into their segment, query values are encoded on the wire, header values can't carry CR or LF through the platform. Undeclared names go to the query string, and nowhere else.
- **Target fidelity (P2).** Requests go where your axios defaults, the definition's `servers` and `withServer` say. No parameter value changes host, scheme or base path. Server variables honour their `enum`.
- **A definition can't take over the process (P3).** No `Object.prototype` pollution through `paths` keys, no overwriting of axios members through `operationId`s, no external `$ref` fetches, no code-executing YAML tags. GHSA-2m2m-v425-g898 was the fix.
- **No code evaluation, no network or filesystem outside the contract (P4, P5).** The one request the library makes on its own is `GET <definition>` at `init()`, when the definition is a URL.
- **No hangs, no crashes (P8).** A bounded definition or argument that hangs or crashes the process is a bug.
- **Releases come from this repository (R1, R2).** See [Verifying a release](#verifying-a-release).

**What it does NOT do:**

- No validation. Not of the definition, not of parameters, not of bodies, not of responses. Values are stringified and sent.
- No authentication. The `security` field is copied onto operations for your inspection. Credentials live in the headers and interceptors you configure, and they go to every server the definition names, operation-level `servers` included.
- No cookie parameters. Declared `in: cookie` parameters are not sent.
- No `style` / `explode` on the wire. axios serialises `params` its own way.
- No retries, timeouts, size or rate limits. axios options, your call.

**Reported often, not a vulnerability here** (the full list with reasons is [§10a](docs/threat-model.md#10a-what-gets-reported-that-isnt-a-bug)):

- Undeclared parameters being sent as query parameters. Documented default. Allow-list keys before forwarding an object.
- `Authorization` going to an operation-level `servers` URL. The definition is trusted configuration. Read its `servers` before you trust it with credentials.
- The `config` argument overriding `baseURL` or `url`. It's the application's by contract. Never build it from user input.
- `__proto__` keys in a parameters object, CRLF in header values, circular `$ref`s, code tags in YAML. All tested, all harmless.
- Issues in devDependencies, in axios itself or in [openapicmd](https://github.com/openapistack/openapicmd) (`typegen` lives there).
- Anything that only reproduces on an unsupported version.

## Running it safely

Pass the definition as an object, or load it from a URL you operate, and pin it. Read its `servers` at every level before you give the client credentials. Allow-list parameter names before forwarding an object as the first argument, and never build the `config` argument from user input: it can override `url`, `baseURL`, `method` and `headers`. Validate presence and type yourself. A missing path parameter is sent as the literal segment `undefined`.

```js
// what a call will do, without doing it
const { url, headers } = api.getRequestConfigForOperation('getPetById', [{ petId: userInput }]);
```

That's the core of the contract. The full checklist is [§9 of the threat model](docs/threat-model.md#9-what-do-you-need-to-do).

## Verifying a release

Since 7.9.0 (February 2026), every release is published from a git tag by [`ci.yml`](.github/workflows/ci.yml) through npm trusted publishing (OIDC). Each one carries a signed [provenance attestation](https://docs.npmjs.com/generating-provenance-statements) that names the workflow, the tag and the commit that built it. 7.8.0 and older have none.

- `npm audit signatures` checks the registry signatures and provenance attestations of what you installed. It flags attestations that fail, not ones that are missing, so a 7.9.0-or-later release *without* one is your red flag.
- The version page on npmjs.com links each release to its commit and build.
- The build is reproducible. `npm ci --ignore-scripts && npm run build && npm pack` at a release tag gives a tarball byte-identical to the one on npm: its sha512 matches `npm view openapi-client-axios@<version> dist.integrity`. Checked for 7.9.1 on 2026-10-09.

To tie a tarball to this repository, its release workflow and its tag, use the GitHub CLI. Tags carry a `v` prefix:

```sh
npm pack openapi-client-axios@7.9.1
curl -s https://registry.npmjs.org/-/npm/v1/attestations/openapi-client-axios@7.9.1 \
  | jq -c '.attestations[] | select(.predicateType == "https://slsa.dev/provenance/v1") | .bundle' > provenance.jsonl
gh attestation verify openapi-client-axios-7.9.1.tgz --bundle provenance.jsonl --digest-alg sha512 \
  --repo openapistack/openapi-client-axios \
  --signer-workflow openapistack/openapi-client-axios/.github/workflows/ci.yml \
  --source-ref refs/tags/v7.9.1
```

Provenance tells you where a release was built, not that its code is good, and it names a workflow and a tag, not a person. axios and the other dependency versions come from your lockfile, not from this project. Commit one, and review the diff when you bump.

## Incident Response Plan

What happens if something actually goes wrong? Honest answer first: openapi-client-axios has one maintainer. There is no security team, no on-call rotation and no SLA. This is the plan for the person who is here, sized for the project it is. It's a compression of GitHub's [incident response guide](https://docs.github.com/en/code-security/tutorials/secure-your-organization/respond-to-a-security-incident) down to what one person can actually execute.

**What counts as an incident?** Something worse than a vulnerability report:

- A malicious or tampered version of `openapi-client-axios` on npm.
- The maintainer's GitHub or npm account, or the release workflow, compromised.
- A published vulnerability in the library being actively exploited.
- A dependency advisory that makes the library exploitable through a documented use. [§14](docs/threat-model.md#14-how-does-a-release-get-to-you) lists which dependencies see call arguments.

A vulnerability report that isn't being exploited is not an incident. It goes through the process above.

**The plan:**

1. **Assess.** Is it real, is it still active, what's the blast radius? Check the suspect version's provenance: it should name `ci.yml`, a tag I pushed, and a commit on `main`. A version without provenance, or one whose rebuild doesn't match (see [Verifying a release](#verifying-a-release)), didn't come out of the pipeline. Then check the GitHub audit log and the Actions runs. CI publishes with OIDC and never uses a stored npm token. If provenance and the rebuild both check out, the pipeline is probably fine and the problem is in the code.
2. **Contain.** In this order: `npm deprecate` the bad version with a message pointing to the advisory, ask npm support to take a malicious version down (a version other packages depend on can't simply be unpublished), revoke GitHub and npm sessions and tokens, disable GitHub Actions on the repo, lock `main`. Deprecation is the fast part I control. It warns every installer, where a silent unpublish would just break builds.
3. **Investigate.** Figure out the entry point before writing the fix. Check for persistence: unexpected workflows, webhooks, deploy keys, installed apps, collaborators, tags and npm trusted-publisher settings.
4. **Remediate.** Rotate whatever could have been exposed. Publish a clean patch from a verified tag. Open or update a GitHub Security Advisory with affected and patched versions.
5. **Communicate.** The advisory is the single source of truth. Pin it in the README until the patched version is a week old. Reply to whoever reported it.
6. **Reflect.** Timeline and root cause go into the advisory. Anything that should change in the code or the process becomes an issue. Update [docs/threat-model.md](docs/threat-model.md) if the incident found a gap in it.

**Realistic expectations.** I'll aim to deprecate a confirmed malicious version within 24 hours of confirming it. Everything else is best effort, around a day job and a family. If I'm unreachable for an extended period there is nobody else with publish rights, and that's a known limitation of depending on a single-maintainer project. Pin your versions, review the diff when you bump them, and keep your own incident plan for the software you ship.

**Enterprise security inquiries.** Security questionnaires, SLAs, compliance attestations, escrow, or anything that needs a signature: reach out to **support@openapistack.co**. Those are commercial support topics, not something a public policy can promise.

## Scope and safe harbor

This policy covers security vulnerabilities in the code maintained in this repository and released versions of `openapi-client-axios`. Do not test against systems or data that you do not own or have explicit permission to assess, and do not intentionally access, modify, or retain data belonging to others.

We ask security researchers acting in good faith to avoid service disruption, privacy violations, and destructive testing. We will not pursue legal action for good-faith research that follows this policy, stays within scope, and stops when a vulnerability is confirmed.

This is a voluntary vulnerability-disclosure policy. It does not grant permission to test third-party systems and does not replace any legal or regulatory obligation that may apply.
