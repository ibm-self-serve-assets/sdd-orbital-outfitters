# Specification 9: Containerization on OpenShift (IBM Cloud)
Deploy the Orbital Suppliers application to the ROKS cluster provisioned earlier.

## Prerequisites
Check each prerequisite before writing any code. Stop and tell the user if any are missing.
- Ensure `OCP_APP_HOSTNAME` is in @.env before proceeding.

Load the following skills plus any others that seem relevant — new ones may be added over time:
- `ibm-cloud` — `ibmcloud` CLI commands, ICR login, `oc` cluster targeting
- `infrastructure-as-code-terraform` — Kustomize manifest patterns and overlay management

| Prerequisite | Check | Notes |
|---|---|---|
| `ibmcloud` CLI | `ibmcloud version` | ❌ User must install manually |
| `oc` CLI | `oc version --client` | `brew install openshift-cli` |
| `kustomize` | `kustomize version` | `brew install kustomize` |
| `docker` or `podman` | See check below | ❌ User must start/install — cannot be automated |

**Container runtime check** — run this before proceeding and stop if both fail:

```bash
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  echo "docker: ready"
elif command -v podman &>/dev/null && podman info &>/dev/null 2>&1; then
  echo "podman: ready"
else
  echo "ERROR: No container runtime available."
  echo "  - Docker Desktop / Rancher Desktop: start the application and wait for it to be ready"
  echo "  - Podman Desktop: brew install --cask podman-desktop, then start it"
  exit 1
fi
```

If neither is available, **stop and tell the user** — image builds cannot proceed without a container runtime.

## Services to deploy

| Service | Runtime | Notes |
|---------|---------|-------|
| `frontend` | Nginx serving React SPA | `VITE_BACKEND_URL` must be **empty** on OpenShift — browser uses relative URLs proxied by nginx to the backend Service |
| `backend` | Node.js / Express | Loads `all-MiniLM-L6-v2` ONNX model on first request. Model must be pre-fetched into the image — no internet egress from cluster. |
| `opensearch` | OpenSearch 2.13.0 | Needs a PVC — index segments must survive pod restarts. **Must be pushed to ICR** — the cluster has no internet egress and cannot pull from Docker Hub directly. Build via `Dockerfile.vector-db` and push to ICR before deploying. |
| Database | External | IBM Cloud PostgreSQL — accessed via **private VPE endpoint** (see Spec 8 Step 4). The public hostname is unreachable from inside the cluster. |
| WO Agent | External | watsonx Orchestrate — use the **private endpoint**: `https://api.private.<region>.watson-orchestrate.cloud.ibm.com`. The public `api.<region>.watson-orchestrate.cloud.ibm.com` is unreachable from the cluster. |

## Cluster sizing

**Target load:** ≤ 25 simultaneous users. No auto-scaling required. Worker flavor `cxf.8x16` (8 vCPU · 16 GB) was selected because the backend's transformer embedding of user queries is CPU-bound. Two worker nodes give redundancy; all three pods fit comfortably on one node.

**Pod resource requests/limits:**

| Pod | Request | Limit |
|-----|---------|-------|
| `frontend` | 64 MB | 128 MB |
| `backend` | 512 MB | 768 MB |
| `opensearch` | 768 MB | 1 GB |

## Required `Dockerfile.*` files

Place all Dockerfiles under `openshift/` (e.g. `openshift/Dockerfile.backend`). The build context is always the repo root so `backend/`, `frontend/`, and `openshift/nginx.conf` are all reachable.

Generate these files:
- `openshift/Dockerfile.frontend`
- `openshift/Dockerfile.backend`
- `openshift/Dockerfile.vector-db`

### Dockerfile requirements

**`Dockerfile.backend`**
- Use `FROM node:20` (Debian-based) — **not** `node:20-alpine`. The `onnxruntime-node` package bundles glibc-linked native binaries that are incompatible with Alpine's musl libc.
- Before writing the `CMD`, check `backend/package.json` for the `"main"` field and use that value as the entry point. Do not assume a filename.

**`Dockerfile.frontend`**
- Use `FROM --platform=$BUILDPLATFORM node:20-alpine AS builder` for the build stage. This runs `vite build` on the native host architecture, avoiding a fatal Go runtime (esbuild) QEMU crash when cross-compiling to `linux/amd64` on Apple Silicon.
- Use `FROM nginxinc/nginx-unprivileged:alpine` for the final stage — **not** `nginx:alpine`. OpenShift runs containers as arbitrary non-root UIDs; the standard nginx image requires root to create cache directories and will fail with `Permission denied`. The nginx config must listen on port `8080`.
- The `ARG VITE_BACKEND_URL` default must be `""` (empty string) — never a localhost URL. Any non-empty default is baked into the compiled JS if `--build-arg` is ever omitted.
- Build the frontend image with `--no-cache`. Vite bakes `VITE_BACKEND_URL` into the compiled JS at build time; Docker's layer cache cannot detect that the value changed, so a cached `RUN npm run build` layer silently ships the old URL.
- Add `absolute_redirect off;` inside the nginx `server` block. The OpenShift Route terminates TLS externally — nginx sees only plain HTTP on port 8080 and will emit `http://hostname:8080` absolute `Location` headers on any trailing-slash redirect (e.g. `/products` → `/products/`) unless this directive is set. The browser blocks those redirects as mixed content.

**`Dockerfile.vector-db`**
- Use `FROM opensearchproject/opensearch:2.13.0` as the base image. Pull it locally (`docker pull opensearchproject/opensearch:2.13.0`) and push it to ICR under `vector-db:latest` — **do not** reference Docker Hub in any pod spec; the cluster has no internet egress.
- Set the required env vars in the Dockerfile (`discovery.type=single-node`, `DISABLE_SECURITY_PLUGIN=true`, `DISABLE_INSTALL_DEMO_CONFIG=true`, `OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m`) and expose ports `9200` and `9300`.
- Add `imagePullPolicy: Always` to the StatefulSet container spec so the node always pulls the latest ICR image rather than using a stale local cache.
- **OpenShift SCC:** OpenSearch runs as UID 1000, which falls outside ROKS's `restricted-v2` UID range (`1000640000+`). Grant `anyuid` to the namespace's `default` service account before deploying:
  ```bash
  oc adm policy add-scc-to-user anyuid system:serviceaccount:orbital-suppliers:default
  ```
  Do **not** add `runAsNonRoot: true`, `capabilities.drop`, or `seccompProfile` constraints to the pod spec — they conflict with `anyuid` and will prevent OpenSearch from starting.
- **PVC permissions:** Set `securityContext.fsGroup: 1000` on the StatefulSet pod spec. Without it, a freshly provisioned RWO block volume on ROKS is root-owned and OpenSearch (UID 1000) cannot write to it, causing `AccessDeniedException: /usr/share/opensearch/data/nodes` on startup.

## Requirements

- **Build platform:** All images must target `linux/amd64` — ROKS clusters run on x86-64 nodes. Pass `--platform linux/amd64` to every `docker build` / `podman build` command. Failure to do so results in `exec format error` at pod startup.
- **ICR login:** Use `ibmcloud cr login --client docker` (if Docker is available) or `ibmcloud cr login --client podman` (if Podman is available). Never use `docker login us.icr.io` directly. The ICR registry **hostname is not `$REGION.icr.io`** — the region name and the registry hostname are different things. Use this mapping when tagging and pushing images:

  | Region | Registry hostname |
  |--------|-------------------|
  | `us-south` | `us.icr.io` |
  | `eu-central` | `de.icr.io` |
  | `uk-south` | `uk.icr.io` |
  | `ap-south` | `au.icr.io` |
  | `ap-north` | `jp.icr.io` |
  | `jp-osa` | `jp2.icr.io` |
  | `ca-tor` | `ca.icr.io` |
  | `br-sao` | `br.icr.io` |

  `ibmcloud cr login` prints the correct hostname on login (`The registry is 'us.icr.io'`) — use that value, not the region string.
- Use `kustomize` overlays for dev/prod differences. Store base manifests under `openshift/manifests/base/` and overlays under `openshift/manifests/overlays/`.
- Namespace: `orbital-suppliers`. Resources: `Deployment` (frontend, backend), `StatefulSet` (opensearch), `Service` (ClusterIP for each), `Route` (TLS edge → frontend), `ConfigMap` (`app-config`), `Secret` (`app-secrets`), PVC (`opensearch-data`, 5 GB RWO block).
- Split `.env` into:
  - **`ConfigMap` `app-config`** — non-sensitive: `BACKEND_PORT`, `OPENSEARCH_HOST`, `OPENSEARCH_PORT`, `OPENSEARCH_INDEX`, `DB_HOST` (**use `DB_HOST_PRIVATE` from `.env`** — not `DB_HOST`; the public hostname is unreachable from inside the cluster), `DB_PORT`, `DB_NAME`, `DB_SCHEMA`, `DB_SSL`
  - **`Secret` `app-secrets`** — sensitive: `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `PASSWORD_HASH_SECRET`, `SESSION_SECRET`, `WO_API_KEY`, `WO_INSTANCE_URL`, `WO_AGENT_ID`, `WO_ENVIRONMENT_ID`
- `DB_USER` / `DB_PASSWORD` are the same IBM Cloud IAM credentials used to seed the database — they work over the VPE private connection. No separate cluster credentials are needed.
- Secrets must be created via `oc create secret` — never committed to git.
- TLS on the Route uses OpenShift edge termination — no cert management inside pods.
- `deploy.sh` must be made executable and committed with the correct mode: `git update-index --chmod=+x openshift/deploy.sh`.
- `deploy.sh` secret creation uses `DB_USER` / `DB_PASSWORD` — the same credentials from `.env`.
- **Image registry restriction:** The cluster pulls images only from ICR (via VPE). Do not reference Docker Hub, quay.io, Red Hat registry, or any other public registry in any container spec — including init containers and sidecars. All images must be pushed to ICR, or reuse an app image that already contains the needed tooling.
- Write simple docs under `openshift/docs/` (`setup.md` and `configuration.md`, ≤ 3 pages each).

## ICR pull secret

When a new namespace is created on ROKS, it does not automatically inherit the cluster's ICR pull secret. After creating the namespace, copy the pre-wired secret from `default` and link it:

```bash
oc get secret all-icr-io -n default -o json | \
  python3 -c "
import sys, json
s = json.load(sys.stdin)
s['metadata'] = {'name': s['metadata']['name'], 'namespace': 'orbital-suppliers'}
print(json.dumps(s))
" | oc apply -f -

oc secrets link default all-icr-io --for=pull -n orbital-suppliers
```

Pods will hit `ImagePullBackOff` without this step.

## Kustomize gotchas

- Use the `labels` block (not the deprecated `commonLabels`) in `kustomization.yaml` to avoid mutating pod selector labels.
- To patch a static base `ConfigMap` from an overlay, use a `patches` block with a JSON patch op — `configMapGenerator` with `behavior: merge` only works when the base ConfigMap is also generator-managed; against a static base it fails with "id does not exist; cannot merge or replace".
- Validate before applying: `oc kustomize openshift/manifests/overlays/prod`

## Deploy

```bash
grep OCP_APP_HOSTNAME .env   # confirm it is set before proceeding
./openshift/deploy.sh prod
oc get pods -n orbital-suppliers
oc get route orbital-suppliers -n orbital-suppliers
```

## Cleanup
- Add `openshift/.env.*`, `kubeconfig`, and `*.kubeconfig` to `.gitignore`.
