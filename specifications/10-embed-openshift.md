# Specification 10: Embed Product Data into ChromaDB on OpenShift

Run the existing `vector-db/embed.js` script inside the cluster as a Kubernetes **Job**, populating ChromaDB with product embeddings from IBM Cloud PostgreSQL. Runs after Specs 8 and 9 are complete and all pods are `Ready`.

## Prerequisites

Load the following skills plus any others that seem relevant — new ones may be added over time:
- `ibm-cloud` — `oc apply`, `oc logs`, `oc exec` for Job lifecycle management

## Why a Job

Running `embed.js` locally against a remote ChromaDB would require exposing ChromaDB outside the cluster. A Job runs in-cluster, uses ClusterIP networking, and is re-runnable on demand. An init container on the ChromaDB StatefulSet was ruled out — it would re-embed on every pod restart.

## Requirements

- Place the Dockerfile and Job manifest under `openshift/jobs/`.
- Use the existing `vector-db/embed.js` **unchanged**. The build context must be the repo root (not `openshift/jobs/`) so the Dockerfile can `COPY vector-db/`.
- dotenv silently skips missing `.env` files — no `ENV` override or `sed` patch needed in the Dockerfile. All env vars are injected via the Job's `envFrom` referencing `app-config` (ConfigMap) and `app-secrets` (Secret) from Spec 9.
- ChromaDB is reached via its ClusterIP Service at `http://chromadb:8000` — no Route or external access needed.
- Include a `wait-for-chromadb` init container that polls `/api/v2/heartbeat` before the embed container starts. Do not skip this — the Job will fail immediately if ChromaDB is still initializing. **The init container must use the `embed` image itself** (which contains `curl`) — do not use `curlimages/curl`, `busybox`, or any other public image. The cluster cannot pull from public registries.
- Set `ttlSecondsAfterFinished: 3600` on the Job. Stream logs during the run if you need them after the TTL window.
- The Job image is built by `deploy.sh` alongside the other service images, but the Job manifest is applied **after** `deploy.sh` completes — ChromaDB must be `Ready` first.
- **The embedding model must be baked into the image at build time.** `@xenova/transformers` downloads `Xenova/all-MiniLM-L6-v2` from HuggingFace at runtime — the cluster has no internet egress and this will time out. Add a `download-model.mjs` helper script and run it as a `RUN` step during `docker build` (which runs on your local machine and has internet access):

  ```js
  // openshift/jobs/download-model.mjs
  import { pipeline, env } from '@xenova/transformers';
  env.allowLocalModels = true;
  await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  process.exit(0);
  ```

  ```dockerfile
  COPY openshift/jobs/download-model.mjs ./vector-db/download-model.mjs
  RUN cd vector-db && node download-model.mjs
  ```

- **The Dockerfile must also install `curl`** (via `apt-get`) so the same image can be reused as the `wait-for-chromadb` init container without needing a separate public image.

## Run and verify

```bash
oc apply -f openshift/jobs/embed-job.yaml -n orbital-suppliers
oc logs -f job/embed-job -n orbital-suppliers
oc wait --for=condition=complete job/embed-job -n orbital-suppliers --timeout=600s
```

Verify the collection was populated:
```bash
oc exec statefulset/chromadb -n orbital-suppliers -- \
  curl -s http://localhost:8000/api/v2/collections/products
```

## Re-running

`embed.js` uses `upsert` — re-running is safe and updates changed products without duplicating vectors.

```bash
oc delete job embed-job -n orbital-suppliers
oc apply -f openshift/jobs/embed-job.yaml -n orbital-suppliers
```

## `.env` variables (injected via cluster resources)

| Variable | Source |
|----------|--------|
| `CHROMA_HOST`, `CHROMA_PORT`, `CHROMA_COLLECTION_NAME` | ConfigMap `app-config` |
| `DB_HOST` (private VPE hostname), `DB_PORT`, `DB_NAME`, `DB_SCHEMA`, `DB_SSL` | ConfigMap `app-config` |
| `DB_USER`, `DB_PASSWORD` | Secret `app-secrets` — must be the `orbital_app` cluster credentials from Spec 8 Step 4, **not** the IAM service credential from `.env` |
