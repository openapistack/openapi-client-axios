# openapi-client-axios Threat Model

| | |
| --- | --- |
| **Project** | `openapi-client-axios` (npm), https://github.com/openapistack/openapi-client-axios |
| **Version / commit** | 7.9.1 (`6c9ade2`), checked against `main` at `899ba47` (7.9.1 plus the dereference cache fix from #204) |
| **Date** | 2026-10-09 |
| **Status** | **Draft for the maintainer's review.** First version. Nine questions are open in §13. Two of them (Q1, Q5) could change a triage outcome or a release. |
| **Version binding** | This model is versioned with the code. It lives in the repository, not in the npm tarball. A report against version N gets triaged against `docs/threat-model.md` at tag N, not at `main`. |
| **Reporting** | Breaks a §7 or §14 property? Report it privately per [SECURITY.md](../SECURITY.md). Lands in §2 or §8? It gets closed citing this document. |
| **Provenance legend** | *(documented)* = stated in the project's own artifacts (README, docs site, code comments, tests, commit messages, advisories). *(proposed, 2026-10)* = ruled by the maintainer while reviewing this document. *(tested, 7.9.1)* = confirmed by running the code of that release (the probes ran against `main` at `899ba47`; nothing in the request path changed after the 7.9.1 tag). *(inferred)* = my reading of the code, not confirmed, has a matching question in §13. |
| **Confidence** | 30 documented / 7 proposed / 50 tested / 1 inferred |

## What is this document?

The unwritten contract between openapi-client-axios and whoever calls an API through it.

openapi-client-axios takes an OpenAPI 3 document and turns it into an [axios](https://github.com/axios/axios) instance with one method per `operationId` (`client.getPetById(1)`) and a `paths` dictionary (`client.paths['/pets/{petId}'].get(1)`). No code generation. The document is read at `init()`, and from then on every call builds an axios request config from the operation's parameters: path params into the URL template, query params into `params`, header params into `headers`, the second argument into `data`, the third argument merged over the whole config. It runs in Node and in browsers.

It does not validate anything, authenticate anything or look at responses. axios does the HTTP. You do the rest.

Three readers: the integrator who wants to know which threats are theirs now (§8, §9), the triager who needs to close a report by citing a section instead of arguing (§7, §10a, §12), and anyone deciding whether to trust what `npm install` gives them (§14).

---

## 1. What is this library for?

**Intended use:** a runtime REST client driven by one OpenAPI document, used from application code: web frontends, Node services, CLIs, agent and MCP tooling that calls an API described by a spec *(documented: README "Features", "Client")*. The sibling project for the server side is [openapi-backend](https://github.com/openapistack/openapi-backend).

**Deployment:** browsers (through a bundler) and Node. CI tests Node 20 against axios 0.25.0, latest 0.x, latest 1.x and latest *(documented: `.github/workflows/ci.yml`)*. `package.json` declares no `engines` field *(documented; Q8)*. axios and js-yaml are peer dependencies *(documented: `package.json`)*.

**Who supplies what?**

| Role | Trust | Supplies |
| --- | --- | --- |
| **Application** (you) | trusted | the choice of definition, constructor options, the axios instance and its interceptors, runners, transforms and the three arguments of every operation call |
| **End user, or the model behind an agent** | untrusted, **reaches the library only through the application** | the *values* the application forwards into an operation call. If the application forwards a whole object as the first argument, also the parameter *names* (§5) |
| **Definition author** (the API operator, often a third party) | trusted by contract, **hardened since 7.9.1** | the OpenAPI document: operation names, paths, parameter locations, `servers` |
| **Remote server** | untrusted | HTTP responses. The library passes them through untouched |
| **Maintainer and release pipeline** | trusted, and verifiable (§14) | the code in the npm tarball |

No "authenticated peer" role exists. The library holds no sessions and issues no credentials. Whatever authentication happens is in the headers the application configured, or in an interceptor the application wrote.

**Component families.** Same package, different threat profiles:

| Family | Entry points | Touches the outside world? | In model? |
| --- | --- | --- | --- |
| **A. Definition loading** | `init`, `loadDocument`, `initSync`, `dereferenceSync` from `dereference-json-schema`, `js-yaml` for YAML | **Yes, once.** A string `definition` is fetched with axios at `init()` *(documented: code)* | In, as a **trusted-input** boundary with hardening (§3) |
| **B. Client construction** | `createAxiosInstance`, `getOperations`, operation methods, `paths` dictionary | No | **In.** Where GHSA-2m2m-v425-g898 lived (§12) |
| **C. Request building** | `getRequestConfigForOperation`, `getAxiosConfigForOperation`, `query-serializer.ts`, `bath-es5` path templating | No | **In. Primary attack surface.** |
| **D. Server resolution** | `getBaseURL`, `withServer`, `baseURLVariables` | No | **In.** Decides where requests go |
| **E. Transport** | axios, or a runner from `registerRunner` / `axiosRunner` | **Yes.** Every request | **Out** as code (§2). The library hands it a config and gets a response back |
| **F. Types** | `src/types/*`, the `Client` type from `openapicmd typegen` | No | **Out.** Compile-time only (§8 false friend 1) |
| **G. Release pipeline** | GitHub repository, Actions workflows, npm trusted publishing | **Yes.** Publishes to npm | **In** (§14) |

## 2. What is out of scope?

- **The transport.** TLS, certificates, proxies, redirects, timeouts, retries, cookie jars, `withCredentials`. That's axios, or whatever runner you registered. Report axios bugs to axios *(proposed, 2026-10)*.
- **Authentication and authorisation.** The library copies the operation's `security` list onto the operation object for *you* to read *(documented: test "operation security overrides global security with an empty list")*. Nothing acts on it. Credentials live in the headers and interceptors you configured.
- **Request and response validation.** None happens. Values are stringified and sent; responses come back as axios gives them *(documented: README; §8)*.
- **The browser.** CORS, CSRF, cookies, what a page is allowed to call. The platform's problem.
- **Your own code that runs inside the client.** Interceptors, `transformOperationMethod`, `transformOperationName`, runners and the per-call `config` object. In-process, already trusted *(proposed, 2026-10)*.
- **Hostile definitions beyond the 7.9.1 hardening.** The definition is your configuration. It decides which host and path each operation calls, which includes operation-level `servers`. A definition that points an operation at another host is doing what definitions do (§8, false friend 3) *(documented: advisory GHSA-2m2m-v425-g898, "the OpenAPI document is treated as trusted configuration")*.
- **Type generation.** `openapicmd typegen` lives in [openapicmd](https://github.com/openapistack/openapicmd) and has its own model.
- **Dependency advisories that never see application data, and devDependencies.** §14 lists which dependencies see what.

## 3. Where is the trust boundary?

Two at runtime, and a third around the release.

**The first is the argument list of an operation method.** `client.op(parameters, data, config)`. By contract the application controls all three. In practice the application forwards values it got from somewhere else: a form field, a route param, a language model's tool call. So the library's job at this boundary is containment: a value you pass as parameter `petId` ends up as the `petId` path segment, percent-encoded, and nowhere else (P1, P2). What the library does *not* promise is that the value is sensible. `getPetById('../admin')` requests `/pets/..%2Fadmin`. That's the correct request for that argument *(tested, 7.9.1)*.

**The second is the definition.** By contract it's trusted: you chose it, like you chose the code. But definitions get fetched from URLs at startup, and a URL's content can change. Since 7.9.1 a definition can no longer pollute `Object.prototype` or overwrite axios members (P3). It can still send requests wherever its `servers` say, with your default headers attached. That's the ruling, not an oversight (§8).

**The third** is between this repository and your `node_modules`. §14.

Responses are not a boundary in this library: nothing reads them. They are a boundary in your code.

## 4. What does the library assume about its host?

- **Runtime:** Node 20 or a modern browser bundle *(documented: CI matrix; no `engines` field, Q8)*. No native code.
- **Concurrency:** one `OpenAPIClientAxios` instance, one axios instance, shared by every call. Per-call state is the config object built for that call. Mutable instance state: `definition`, `document`, `defaultServer`, `baseURLVariables` (changed by `withServer()`) and the runner map. `withServer()` mid-flight changes the base URL for every later call on that instance *(documented: code)*.
- **Clock:** not used.
- **Filesystem:** never. The `definition` JSDoc says "file path or Document object", but a string is fetched with `axios.get`, so it's a URL *(tested, 7.9.1: a non-URL string rejects with an axios error; Q9)*.
- **Network:** family A only, once, at `init()`. Dereferencing is in-memory and never fetches external `$ref`s: a `$ref` to another URL makes `init()` throw *(tested, 7.9.1)*. Then family E for every call, through axios.
- **What it does NOT do to your process** *(proposed, 2026-10)*:
  - never opens listening sockets, spawns processes, installs signal handlers, reads env vars, writes to `console` or touches global state;
  - never mutates `Object.prototype` from the definition (P3, since 7.9.1);
  - doesn't modify the axios instance you passed in, beyond setting `defaults.baseURL` when it was unset and adding the operation methods, `paths` and `api` properties *(documented: test "request defaults from user-provided axios instance are not modified")*;
  - **does** hand out live objects: `api.definition` is the dereferenced document, and `getOperation()` returns objects that share structure with it. A transform or interceptor that mutates them mutates the client.

### 4a. Which options change the security envelope?

| Knob | Default | What changes | Ruling |
| --- | --- | --- | --- |
| `definition` as a string | | Fetched with `axios.get` at `init()`, following redirects, with the `axiosConfigDefaults` or your axios instance (so with your default headers). JSON when the body parses as an object, YAML when the `content-type` matches `/ya?ml/`, otherwise `init()` rejects *(tested, 7.9.1)*. | Load from a host you trust. The 7.9.1 hardening is a seat belt, not a sandbox. |
| `definition` as an object | | No network. `initSync()` works *(documented: README)*. | Preferred for anything security-sensitive *(proposed, 2026-10)*. |
| `withServer` / `baseURLVariables` | first server, defaults | Picks a `servers` entry by index, description or object. A variable with an `enum` only accepts enum members, by value or by index, and throws otherwise *(tested, 7.9.1)*. A variable without an `enum` ignores the supplied value and uses its default *(tested, 7.9.1; Q10)*. | A server variable can't be steered outside the definition. |
| `axiosConfigDefaults` / `axiosInstance` | `{}` / a fresh instance | Your defaults, your interceptors. `defaults.headers.common` get copied into every operation request *(documented: code)*. | Trusted. This is where credentials usually live. |
| the third argument, `config` | `{}` | Spread over the built config: can override `url`, `baseURL`, `method`, `headers`, `params` *(tested, 7.9.1)*. | Trusted by contract. Never build it from user input (§9). |
| `transformOperationName` | identity | Renames methods. A result that is `__proto__`, `constructor` or `prototype`, or collides with an axios member, is skipped *(tested, 7.9.1; documented: tests)*. | |
| `transformOperationMethod` | identity | Wraps every operation method with your function *(documented: README)*. | Your code. |
| `registerRunner` / `axiosRunner` | axios | Replaces the transport for all or one operation. The runner receives the full config, headers included *(documented: code)*. | Your code. |
| `applyMethodCommonHeaders` | `false` | Also copies `defaults.headers.<method>` into requests *(documented: JSDoc)*. | |
| `quick` | `false` | Accepted and stored. Nothing reads it *(tested, 7.9.1; Q4)*. | Dead option. |

**So what's the insecure default story?** There isn't one in the openapi-backend sense. Defaults are the safe ones: object definitions need no network, path values are encoded, unknown names go to the query string rather than somewhere surprising. The two sharp edges are both opt-in: loading a definition from a URL you don't operate, and forwarding user input into the `config` argument.

## 5. What inputs does the library accept, and from whom?

**`client.<operationId>(parameters, data, config)`** (same for `client.paths[path][method]`):

| Input | Attacker controls it? | What the library does with it | You must enforce |
| --- | --- | --- | --- |
| `parameters` as an object `{ name: value }` | **the values, if you forward them. The names too, if you forward the whole object** | Looks each name up in the operation's `parameters` to find its `in`. **A name the operation doesn't declare defaults to `query`** *(documented: code comment; tested, 7.9.1)*. `undefined` values are skipped. Own `__proto__` keys are harmless: they land in the query string, `Object.prototype` is untouched *(tested, 7.9.1)*. | Allow-list the keys before forwarding an object (§9) |
| `parameters` as an array `[{ name, value, in }]` | same | Explicit location per entry. Lets you send parameters the definition doesn't declare *(documented: README "Parameters")*. | |
| `parameters` as a single value | the value | Assigned to the first `required` parameter, else the first parameter *(documented: README)*. No parameters → throws. | |
| path parameter values | **yes** | `String(value)`, then `bath-es5` substitutes it into the template with `encodeURIComponent`. `/`, `?`, `#`, `.` and `%` stay inside the segment *(tested, 7.9.1: `'20% / 30% off'` → `/discounts/20%25%20%2F%2030%25%20off`; `'../admin?x=1#f'` → `/pets/..%2Fadmin%3Fx%3D1%23f`)*. A missing path parameter becomes the literal segment `undefined`, an object becomes `%5Bobject%20Object%5D` *(tested, 7.9.1; Q2)*. | Validate presence and type before calling |
| query parameter values | **yes** | Two things happen. The raw value goes into axios `params`, and axios serialises it on the wire with its own rules (arrays as `q[]=a&q[]=b` on axios 1.x) *(tested, 7.9.1)*. Separately, `query-serializer.ts` renders the OpenAPI `style` / `explode` form into `RequestConfig.queryString` and `.url`, which custom runners and `getRequestConfigForOperation()` callers see *(documented: tests "query parameter array serialization")*. **The two can differ** (Q1). Values are percent-encoded on both paths. | Nothing for encoding |
| header parameter values | **yes** | Copied as is into `headers`. A value with CR or LF never leaves the process: Node's `http` rejects it with `ERR_INVALID_CHAR`, and browsers refuse it too *(tested, 7.9.1, Node 22)*. | Header *names* come from the definition, so you control them |
| cookie parameter values | **yes** | Collected into `RequestConfig.cookies` and **never sent**: the axios config has no cookie field *(tested, 7.9.1; Q3)*. | If you need cookie params, set the `Cookie` header yourself |
| `data` | **yes, if you forward it** | Passed to axios as `data` untouched. axios JSON-encodes objects; streams and `FormData` pass through *(documented: README "Data")*. | Body shape and size |
| `config` | no, application | Spread over the built config. `params` and `headers` are merged, everything else overrides *(tested, 7.9.1)*. | Never from user input |

**Trusted-only entry points.** Every argument is application-sourced by contract:

| Function | Parameter | Attacker controls it? | Note |
| --- | --- | --- | --- |
| `new OpenAPIClientAxios(opts)` | all of `opts` | no | `definition` as a URL is the one that fetches |
| `withServer(server, variables)` | both | no | `enum` still enforced *(tested, 7.9.1)* |
| `registerRunner(runner, operationId?)` | both | no | |
| `getRequestConfigForOperation(operation, args)` | `operation` | no | `args` as above |
| `getBaseURL(operation)` | `operation` | no | operation-level `servers[0].url` is returned verbatim, variables are not substituted there *(documented: code)* |

**The definition.** Trusted by contract, hardened in practice:

| Definition content | What the library does | Since |
| --- | --- | --- |
| `paths` keys named `__proto__`, `constructor`, `prototype` | skipped; `client.paths` has a null prototype *(tested, 7.9.1)* | 7.9.1 |
| an `operationId` (after `transformOperationName`) that matches an axios member such as `request`, `defaults`, `interceptors`, `get` | skipped, the axios member wins *(tested, 7.9.1)* | 7.9.1 |
| `servers` at the document, path or operation level | decide `baseURL`. Operation and path `servers[0]` override the document's, and your default headers go along *(tested, 7.9.1)* | always |
| external `$ref` (a URL or file) | `init()` throws. Nothing is fetched *(tested, 7.9.1)* | always |
| circular `$ref` | dereferenced with cycles preserved, in about a millisecond *(tested, 7.9.1; documented: dereference-json-schema README)* | always |
| YAML with a code-executing tag (`!!js/function`) | `init()` rejects with `YAMLException: unknown tag`. js-yaml 4's `load` uses the safe schema *(tested, 7.9.1)* | always |

**Size, shape, rate:** nothing enforced. The definition is dereferenced once at `init()`. Per call, the cost is a linear scan of the operation's parameters and the template substitution *(documented: code)*.

## 6. Who is the attacker?

**In scope: whoever controls the values the application forwards into an operation call.** The end user of a web app, the caller of an API that proxies another API, the language model behind an agent that calls tools through this client. It can:

- put any string, number, array or object into any parameter value, and into `data`;
- if the application forwards a whole object as `parameters`, choose parameter *names* too, declared or not;
- repeat calls as often as the application lets it.

What it wants: make the request go to a different path, host or scheme than the operation declares; inject a header or an extra query parameter; get the client to evaluate something; make a call hang or crash the process; pollute a shared prototype *(proposed, 2026-10)*. **A report that needs a capability not listed here isn't in model.**

**In scope, hardening tier: whoever serves a definition the application fetches.** Since 7.9.1 it can't take over the process (P3). It can still decide where requests go. Reports about a fetched definition get `VALID-HARDENING` at most (§12).

**In scope since day one: the supply-chain attacker** (§14). Wants its code in the tarball you install.

**Out of scope** *(proposed, 2026-10)*:

- Anyone who controls constructor options, the `config` argument, the axios instance, interceptors, runners or transforms. That's the application.
- The remote server. It can return any bytes. The library doesn't read them.
- In-process code (other modules). Already won.
- The network between the client and the API. axios and the platform own TLS.
- Co-tenants, container escapes, OS-level attackers, browser extensions.
- Anyone who controls the dependency versions *you* resolve: your lockfile, your registry mirror. §14 says what happens upstream.

## 7. What does the library guarantee?

Only properties the project has actually committed to. No inventing. Release properties R1 to R3 are in §14.

| # | Property (and when it holds) | What a break looks like | Severity | Provenance |
| --- | --- | --- | --- | --- |
| **P1** | **Parameter containment.** A parameter value ends up only in the location its parameter declares. Path values are percent-encoded into their segment, so they can't add a segment, a query string or a fragment. Query values are percent-encoded by axios on the wire (and by `query-serializer.ts` in `RequestConfig`). Header values can't carry CR or LF through the platform's HTTP client. Undeclared names go to the query string, and nowhere else. | A path value that escapes its segment. A query value that adds a second parameter. A header value that adds a second header. A value reaching the URL unencoded. | **Security-critical** | *(tested, 7.9.1: tests "should url encode path parameters", "array of strings with special characters is properly encoded"; probes above)* |
| **P2** | **Target fidelity.** A request goes to the `baseURL` of your axios defaults, else to the server the definition and `withServer` resolve to, with the operation's or path's own `servers[0]` and the per-call `config` as the only overrides. No parameter value, `data` or definition-free input changes the host, scheme or base path. Server variables honour their `enum`. | A request leaving for a host the definition and the application didn't name. A server variable accepting a value outside its `enum`. | **Security-critical** | *(tested, 7.9.1; documented: tests "alternative server with variable in baseURL", "withServer")* |
| **P3** | **A definition can't take over the process.** Reserved property names are skipped, `client.paths` has no prototype, operation methods never overwrite axios members. External `$ref`s are not fetched. YAML is parsed with the safe schema. | `Object.prototype` gaining a property from a definition. `client.request` or `client.interceptors` replaced. `init()` fetching a URL the definition names. A YAML tag executing code. | **Security-critical for the first three, hardening for the rest.** The definition is still trusted by contract, so a break here is `VALID-HARDENING` (§12), as GHSA-2m2m-v425-g898 was. | *(tested, 7.9.1; documented: advisory, tests "does not pollute Object.prototype via a __proto__ paths key", "does not overwrite axios request / interceptors")* |
| **P4** | **No code evaluation.** No definition, argument or response byte is ever `eval`ed, built into a `RegExp` or `Function` or used as a file path. Path templates (`{name}`) are matched literally by `bath-es5`. | Any of those. | **Security-critical** | *(documented: code; maintainer, 2026-10)* |
| **P5** | **No network or filesystem outside the contract.** The only request the library makes on its own is `GET <definition>` at `init()` when `definition` is a string. Dereferencing never fetches. Nothing reads files. | A second request at init. A fetch during a call that isn't the call. A file read. | **Security-critical** | *(tested, 7.9.1: external `$ref` throws; documented: code)* |
| **P6** | **Error contract.** `init()` rejects, and leaves no half-built client, when the definition can't be loaded or parsed: 404, non-JSON and non-YAML body, unknown YAML tag, external `$ref`. Operation methods reject with whatever axios or your runner rejects. `withServer` with a bad enum value throws. | `init()` resolving with a client whose methods are missing. A failed load swallowed. | Correctness-only | *(tested, 7.9.1)* |
| **P7** | **Your axios instance stays yours.** Defaults are untouched except `baseURL` when unset. `__proto__`-keyed parameter objects don't pollute anything. | A default changed after `init()`. A prototype polluted by a call. | Correctness-only | *(tested, 7.9.1; documented: test "request defaults from user-provided axios instance are not modified")* |
| **P8** | **Resource use.** The definition is dereferenced once, at init, cycles included. Building a request is linear in the operation's parameter count. A hang or process crash on a size-bounded definition or argument is a bug. Memory held per client is released when the client is *(documented: #204, "does not retain the definition of a discarded client")*. | Hang, crash or super-linear growth on a bounded input. A client that leaks after it's dropped. | **Availability. `VALID` on the stated line.** | *(tested, 7.9.1: circular refs; documented: #204)* |

**P1 in detail: where does each argument shape go?**

| You pass | Declared `in` | Lands in |
| --- | --- | --- |
| a value for a declared path param | `path` | the URL segment, encoded |
| a value for a declared query param | `query` | axios `params` (and `queryString`) |
| a value for a declared header param | `header` | `headers` |
| a value for a declared cookie param | `cookie` | **nowhere** (Q3) |
| a value for an undeclared name | none | axios `params`, as a query parameter |
| an array entry with `in` set | as given | that location, declared or not |

## 8. What does the library NOT do?

The most useful section for an integrator. Read this one twice.

- **No validation.** Not of the definition, not of parameters, not of `data`, not of responses. A value that doesn't match the schema is sent anyway, stringified *(documented: README; maintainer, 2026-10)*.
- **No authentication.** `security` requirements are copied onto operations for your inspection. Nothing reads them. Put credentials in `axiosConfigDefaults.headers`, an interceptor or the `config` argument *(documented: tests)*.
- **No cookie parameters.** Declared `in: cookie` parameters are collected and dropped *(tested, 7.9.1; Q3)*.
- **No control over where a definition sends you.** Operation-level and path-level `servers[0]` override the base URL, and your `defaults.headers.common` (that's where `Authorization` normally sits) travel with the request *(tested, 7.9.1)*. A third-party definition decides where your credentials go. Treat it as code.
- **No OpenAPI `style` / `explode` on the wire.** The serializer in `query-serializer.ts` renders them into `RequestConfig.queryString` and `.url`, but the request axios sends uses `params` and axios's own serialiser *(tested, 7.9.1; Q1)*. With axios 1.x an array query param goes out as `q[]=a&q[]=b`.
- **No definition validation.** `quick: true` exists for symmetry with openapi-backend and does nothing *(tested, 7.9.1; Q4)*.
- **No variable substitution on operation-level `servers`**, and no override of a server variable that has no `enum` *(tested, 7.9.1; Q10)*.
- **No retries, timeouts, size limits or rate limits.** axios options, your call.
- **No isolation from your own code.** Interceptors, transforms and runners see and can change every request, credentials included.
- **No protection of the definition from its consumers.** `api.definition` is the live object.

**False friends.** Things that look like a control but aren't:

1. **A typed client ≈ validated calls.** The `Client` type from `openapicmd typegen` is compile-time. At runtime `client.getPetById(anything)` stringifies `anything` and sends it *(documented: README "Typesafe Clients")*.
2. **An undeclared parameter ≈ dropped.** It's sent as a query parameter *(tested, 7.9.1)*. Forward a whole request body as `parameters` and every key becomes `?key=value`.
3. **The definition ≈ just data.** It decides the host of every request, through `servers` at three levels, and before 7.9.1 it could reach `Object.prototype`. The advisory calls it trusted configuration. Act accordingly *(documented: GHSA-2m2m-v425-g898)*.
4. **`definition: './openapi.json'` ≈ a file read.** It's an HTTP GET of that string, through axios, with your defaults and following redirects. Use an object, or a URL you operate *(tested, 7.9.1; Q9)*.
5. **`quick: true` ≈ faster init.** No-op *(tested, 7.9.1)*.
6. **`in: cookie` ≈ a `Cookie` header.** Not sent *(tested, 7.9.1)*.
7. **`style` / `explode` in the spec ≈ the query string on the wire.** Only in `RequestConfig`. See Q1.
8. **A missing path parameter ≈ an error.** It's the literal segment `undefined` *(tested, 7.9.1)*. `GET /pets/undefined` is a valid request for a resource that doesn't exist, until it does.

**Attack classes every runtime client leaves to you:**

- *HTTP parameter pollution through forwarded objects.* False friend 2. Allow-list keys.
- *SSRF through the `config` argument.* `config.baseURL` and `config.url` override the target *(tested, 7.9.1)*. Never build `config` from user input.
- *Credential leakage through a third-party definition.* False friend 3. Pin the definition, read its `servers`.
- *Type confusion.* `petId: '1 OR 1=1'` is sent as `/pets/1%20OR%201%3D1`. Encoded correctly, still your problem on the server.
- *Path traversal semantics.* `..` is encoded as `..`, which is not a traversal to a correct server and might be to a broken one. The library's promise is encoding, not meaning.
- *Prototype pollution through response bodies.* The library doesn't merge responses into anything. If you do, that's yours.
- *CSRF, CORS, token storage in browsers.* Platform layer.
- *Oversized bodies, slow servers, hanging connections.* axios `timeout` and `maxContentLength`.

## 9. What do you need to do?

The contract from your side:

1. **Pass the definition as an object, or load it from a URL you operate.** Pin it. A definition URL is a config file fetched over the network with your default headers.
2. **Read `servers` at every level before you trust a definition** with credentials. Operation-level servers win.
3. **Allow-list parameter names before forwarding an object** as the first argument. Or build the object yourself from known keys.
4. **Validate parameter presence and type yourself.** A missing path param is sent as `undefined`; an object as `[object Object]`. The library encodes, it doesn't judge.
5. **Never build the `config` argument from user input.** It can override `url`, `baseURL`, `method` and `headers`.
6. **Keep credentials in `axiosConfigDefaults.headers.common` or an interceptor,** and know that both go to every server the definition names.
7. **Set `in: cookie` parameters as a `Cookie` header yourself** until Q3 is settled.
8. **If your API depends on `style` / `explode` query serialisation,** check what axios actually sends (Q1), or set `paramsSerializer` in your axios config.
9. **Set axios `timeout` and `maxContentLength`.** The library sets neither.
10. **Don't mutate `api.definition` or the objects `getOperation()` returns** from transforms or interceptors. They're shared.
11. **Keep a lockfile and check what you install** (`npm audit signatures`, §14).

## 10. How does this library get misused?

- A definition fetched at startup from a partner's URL, with `Authorization` in `defaults.headers.common`. The partner's spec (or whoever gets to edit it) now decides where the token goes.
- `client.searchPets(req.query)` in an Express handler. Every query key the browser sent is forwarded, and so is every key it didn't declare (false friend 2).
- `client.getPetById(req.params.id, null, { baseURL: req.headers['x-target'] })`. A header picks the target host.
- An agent framework that maps a model's tool-call arguments straight into `parameters` without a schema check. The model chooses names and values.
- `client.getPetById()` with no argument, "because the type is optional". `GET /pets/undefined`.
- Relying on `in: cookie` parameters for a session cookie that never gets sent, then "fixing" it by putting the session in a query param.
- Treating `quick: true` as a security or performance setting.

### 10a. What gets reported that isn't a bug?

Feed this to your scanner as a suppression list.

| Reported as | CWE | Why it's not a bug here |
| --- | --- | --- |
| "An `operationId` named `request` overwrites `client.request`" / "`__proto__` path key pollutes `Object.prototype`" | CWE-1321, CWE-915 | Fixed in 7.9.1 (GHSA-2m2m-v425-g898). On 7.9.0 and older: `OUT-OF-MODEL: unsupported-version`. |
| "Undeclared parameters are sent as query parameters" | CWE-235 | Documented default *(code comment, README array form)*. `BY-DESIGN: property-disclaimed`, false friend 2. |
| "No validation of request body / parameters against the schema" | CWE-20 | §8, first bullet. `BY-DESIGN`. |
| "`Authorization` header sent to an operation-level `servers` URL" | CWE-200 | The definition is trusted configuration and `servers` is its job (§2, false friend 3). `OUT-OF-MODEL: trusted-input`. |
| "`definition` URL fetch is SSRF" / "follows redirects" | CWE-918 | Operator-chosen URL, fetched once at init, with the operator's axios defaults. `OUT-OF-MODEL: trusted-input`. |
| "`config.baseURL` / `config.url` override lets the caller change the target" | CWE-918 | The `config` argument is the application's by contract (§5). `OUT-OF-MODEL: trusted-input`. Forwarding user input into it is §10 misuse. |
| "`__proto__` key in the parameters object" | CWE-1321 | Lands in the query string, pollutes nothing *(tested, 7.9.1)*. `KNOWN-NON-FINDING`. |
| "CRLF in a header parameter value" | CWE-113 | Node and browsers refuse to send it *(tested, 7.9.1)*. `KNOWN-NON-FINDING`, unless a custom runner sends raw bytes, which is the runner's bug. |
| "YAML definition can execute code" | CWE-502 | js-yaml 4 `load` uses the safe schema, `!!js/function` throws *(tested, 7.9.1)*. `KNOWN-NON-FINDING`. |
| "Circular `$ref` causes infinite recursion" | CWE-674 | Handled by `dereference-json-schema` *(tested, 7.9.1)*. `KNOWN-NON-FINDING`. |
| "External `$ref` reads files / fetches URLs" | CWE-918, CWE-73 | Not supported, `init()` throws *(tested, 7.9.1)*. `KNOWN-NON-FINDING`. |
| "Cookie parameters are not sent" | | True, and a correctness bug, not a vulnerability (Q3). Issue tracker, not advisory. |
| "`style` / `explode` ignored on the wire" | | True (Q1). Correctness. |
| "Missing path parameter sends `/pets/undefined`" | CWE-20 | Documented here as false friend 8 (Q2). Correctness. |
| "Advisory in `axios`" | CWE-1395 | Peer dependency you chose and pinned. Upgrade axios. Only in model if this library's code makes it reachable in a way plain axios use isn't. |
| "Advisory in jest, msw, axios-mock-adapter, ts-jest, prettier, typescript" | CWE-1395 | devDependencies. `OUT-OF-MODEL: unsupported-component`. |

## 11. When does this model need a rewrite?

- Cookie parameters getting sent (Q3), or `style` / `explode` reaching the wire (Q1). Both change P1's table.
- Any validation landing in the library (request or response). §8's first bullet stops being true and a new property appears.
- `init()` resolving external `$ref`s, or reading files. P5 changes.
- A built-in auth helper (bearer, API key, OAuth refresh). The library would start handling credentials.
- Dropping the array parameter form or changing the undeclared-name default.
- A change in how releases get built or published (§14).
- A new runtime dependency, or an existing one starting to see call arguments (§14 table).
- **Every advisory.** The fix release updates the header, the §12 log and any property the report sharpened.
- **Evidence the model is incomplete:** any report that can't be routed to exactly one §12 disposition. Fix by editing §7 or §8, not by ad-hoc triage.

## 12. How do we triage a report?

Closed set. A report that doesn't fit isn't "other", it's `MODEL-GAP`.

| Disposition | Meaning | Licensed by |
| --- | --- | --- |
| `VALID` | Breaks P1, P2, P4, P5 or P8 through the in-scope attacker of §6, or R1 to R3. | §7, §5, §6, §14 |
| `VALID-HARDENING` | A P3 break, or a §10 misuse easy enough that we choose to harden. The definition is trusted by contract, so this tier tops out at Low or Medium and may ship without a CVE. | §3, §10 |
| `OUT-OF-MODEL: trusted-input` | Needs control of options, the `config` argument, the axios instance, a transform, a runner or the definition beyond what P3 covers. | §5 |
| `OUT-OF-MODEL: adversary-not-in-scope` | Needs in-process, network, server-side or platform capability. | §6 |
| `OUT-OF-MODEL: unsupported-component` | Lands in devDependencies, types or `openapicmd`. | §2 |
| `OUT-OF-MODEL: unsupported-version` | Only reproduces on a version older than the latest 7.x release. | [SECURITY.md](../SECURITY.md#supported-versions) |
| `BY-DESIGN: property-disclaimed` | About a §8 non-property or false friend. | §8 |
| `KNOWN-NON-FINDING` | Matches a §10a row. | §10a |
| `MODEL-GAP` | Doesn't route cleanly. Revise the model. | §11 |

**Show, don't hypothesise.** A report needs something runnable: the definition, the options and the call. `getRequestConfigForOperation()` lets you show a bad URL without sending a request.

**Does the model survive contact with real reports?** One so far:

| Report | Disposition | Section | Severity | Fixed in | Credit |
| --- | --- | --- | --- | --- | --- |
| [GHSA-2m2m-v425-g898](https://github.com/openapistack/openapi-client-axios/security/advisories/GHSA-2m2m-v425-g898): `paths` keys and `operationId`s from the definition could pollute `Object.prototype` or overwrite axios instance members | `VALID-HARDENING` | P3 | Low | 7.9.1 | p- (GitHub Security Lab) |

One out of one routes cleanly. The same reporter found the `apiRoot` aliasing in openapi-backend the same week, which is the kind of cross-project attention a shared `bath-es5` and a shared maintainer invite.

## 13. What still needs deciding?

Ten open. Q1 and Q5 matter most.

1. **`style` / `explode` on the wire.** `query-serializer.ts` renders them into `RequestConfig.queryString`, but `getAxiosConfigForOperation()` hands axios the raw `params` object, so axios's serialiser decides the wire format *(tested, 7.9.1)*. Was that the intent (serialisation for custom runners only), or should the built `url` carry the query string and `params` be dropped? → P1, §8, false friend 7.
2. **Missing path parameters.** `${undefined}` becomes the segment `undefined`. *Proposed:* throw at call time when a declared `required` path parameter is missing. → §5, false friend 8.
3. **Cookie parameters.** Collected, never sent. *Proposed:* either set a `Cookie` header from them in Node (browsers won't allow it anyway), or document them as unsupported and drop the collection. → §5, §8.
4. **`quick`.** Dead option. *Proposed:* deprecate in the types, remove in 8.0. → §4a.
5. **Least privilege in CI.** `ci.yml` sets `id-token: write` at the workflow level, so the four test jobs, which run `npm install axios@<range>` against the live registry, can mint the same OIDC token the publish job uses; actions are pinned to major tags, not commits; `publish` runs `npm ci` with install scripts enabled *(documented: `.github/workflows/ci.yml`)*. *Proposed:* move `id-token: write` into the `publish` job, pin actions to SHAs, `npm ci --ignore-scripts` in `publish`. Same shape as openapi-backend's `ci.yml` after its 2026-09 hardening. → §14, R3.
6. **Branch protection and signing.** I don't know from the repository alone whether `main` is protected against force-push and whether tags are signed. *Needs:* the maintainer to state it, then §14 records it. → §14.
7. **Ownership and revision.** *Proposed:* the maintainer owns this file. It gets updated in the same release as any change listed in §11, including every advisory fix. Each `VALID` or `VALID-HARDENING` fix gets a regression test named after its advisory. → header, §11.
8. **`engines`.** `package.json` declares none. CI tests Node 20. *Proposed:* declare `>=20` or whatever the oldest tested runtime is. → §4.
9. **The `definition` JSDoc.** Says "file path or Document object". A string is fetched over HTTP. *Proposed:* fix the comment and the docs site. → §4, false friend 4.
10. **Server variables without `enum`.** A supplied value is ignored and the default used *(tested, 7.9.1)*. Bug or intent? Either way, document it. → §4a.

Note to self: Q1 and Q3 both change the P1 table. Decide them together, in one release, and bump the model.

## 14. How does a release get to you?

The third trust boundary. §3 is about what a caller can do to a running client. This is about what it takes to change the code you install. For an npm library that's the worst case: a malicious release runs inside every consumer at once, no request needed *(proposed, 2026-10)*.

**The path.**

1. A commit lands on `main`. One maintainer has write access.
2. The maintainer pushes a version tag (`v7.9.1`).
3. [`ci.yml`](../.github/workflows/ci.yml) runs the `test` job four times (axios 0.25.0, latest 0.x, latest 1.x, latest), then the `publish` job.
4. `publish` installs with `npm ci`, builds with `tsc` (through the `prepare` script) and publishes through npm trusted publishing (OIDC). npm records a signed provenance attestation.
5. npm serves the tarball. **Your** lockfile decides when you take it, and which axios comes with it.

**What the project guarantees.**

| # | Property | Backed by | How to check |
| --- | --- | --- | --- |
| **R1** | **Provenance.** Every release since 7.9.0 (February 2026) was published by `ci.yml`, from a tag, through npm trusted publishing, and has a provenance attestation naming the workflow, the tag, the commit and the run. 7.8.0 and older have none. | Trusted publishing since 7.9.0 *(tested: registry attestations for 7.8.0 → none, 7.9.0 and 7.9.1 → SLSA v1 plus npm publish attestation)* | `npm audit signatures`, or `gh attestation verify` with the workflow and `refs/tags/v<version>` (see SECURITY.md) |
| **R2** | **Reproducible build.** A release tarball is byte-identical to `npm ci --ignore-scripts && npm run build && npm pack` at its tag: same sha512 as `dist.integrity`. | Lockfile-pinned `tsc`, `npm pack`'s fixed timestamps, no network at build time | Rebuild and compare against `npm view openapi-client-axios@<version> dist.integrity` *(tested, 7.9.1: `sha512-T8BqBw…` on both sides)* |
| **R3** | **Least privilege in CI.** *Not yet.* Today every job in `ci.yml` can request an OIDC token (Q5). The `publish` job is still the only one that runs `npm publish`, and nothing in the repository holds an npm token. | | Q5 is the fix. Until it ships, R3 is a goal, not a guarantee. |

A break of R1 or R2 is `VALID` (§12): a release without provenance, or a tarball that doesn't match its tag. Report it privately. Please don't demonstrate CI attacks by opening pull requests against this repository.

**Threats, and what stands in their way.**

| Threat | What it looks like | What stops it here | What's left |
| --- | --- | --- | --- |
| Maintainer account takeover | A phished npm or GitHub login | Nothing in this repository: it comes down to the maintainer's GitHub and npm accounts. | **The biggest residual risk.** One person holds GitHub admin and npm publish rights. |
| Malicious code in a dependency, run in CI | Install scripts that steal tokens and republish | `publish` holds no stored token. Provenance would name the run. | Every job can mint an OIDC token today (Q5). A hostile install script in the `test` matrix, which resolves axios live, runs with that ability. |
| A compromised GitHub Action | A tag moved to malicious code | Dependabot proposes updates. | Actions are pinned to major tags (`actions/checkout@v5`), not commits (Q5). |
| Workflow injection | Untrusted pull request data reaching a privileged workflow | No `pull_request_target`. Fork pull requests get a read-only token and no secrets. Publishing needs a tag, which only the maintainer can push. | |
| A malicious version of `axios`, `bath-es5` or `js-yaml` | A new release with a payload | Not in this project's hands. Peer and `^` ranges resolve in *your* lockfile. | Your lockfile, your review, your cooldown before taking new versions |

**Which dependencies see what?** A dependency advisory is only a vulnerability in openapi-client-axios if it's in a "yes" row and reachable with the inputs in §5.

| Dependency | Kind | Used for | Sees call arguments? | Sees the definition? |
| --- | --- | --- | --- | --- |
| `axios` | peer, `>=0.25.0` | every request, and the definition fetch | **yes** | yes (the fetch) |
| `bath-es5` | runtime | path templating and `encodeURIComponent` of path params, server variable substitution | **yes** (path values) | yes (templates) |
| `js-yaml` | peer, `^4.1.0`, loaded on demand | parsing a YAML definition | no | yes |
| `dereference-json-schema` | runtime | dereferencing `$ref`s at init | no | yes |
| `openapi-types` | runtime | TypeScript types. Not loaded at runtime | no | no |
| `jest`, `msw`, `axios-mock-adapter`, `ts-jest`, `prettier`, `typescript` | dev | tests and build | no | no |

**What the project doesn't do.** Nothing enforces commit signing or tag signing that I can see from the repository *(inferred, Q6)*. Provenance ties a release to a commit and a CI run, not to a person, and it can't tell you the commit is honest. Releases before 7.9.0 have no provenance. There is no second publisher.

**Your part.** Commit a lockfile. Run `npm audit signatures`, and treat a 7.9.0-or-later release without provenance as an incident. Read the diff when you bump (`npm diff --diff=openapi-client-axios@<old> --diff=openapi-client-axios@<new>`). Consider a cooldown of a few days before adopting any fresh release, this library included.

## 15. Revision history

| Date | Release | Change |
| --- | --- | --- |
| 2026-10-09 | 7.9.1 | First draft, written against 7.9.1 and `main` at `899ba47`. Modelled on openapi-backend's `docs/threat-model.md` (2026-09-29). Ten questions open. |

---

### Appendix: provenance count

Documented: 30 · Proposed: 7 · Tested: 50 · Inferred: 1. Counted by tag, so a claim with two sources counts twice. The inferred claim is Q6 (branch protection and signing). Q1 to Q4 and Q8 to Q10 ask whether a tested behaviour should change, Q5 is a release-pipeline fix, Q7 is process. Every *(proposed)* tag is a sentence the maintainer has to either sign or strike before this stops being a draft.
