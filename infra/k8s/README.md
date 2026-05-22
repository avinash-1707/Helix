# Helix — Kubernetes (EKS) Deployment

Helm charts for deploying Helix to AWS EKS. One chart per service, as in
`code-standards.md`:

| Chart            | Kind          | Notes                                        |
| ---------------- | ------------- | -------------------------------------------- |
| `postgres/`      | StatefulSet   | PostgreSQL + TimescaleDB, PVC.                |
| `redis/`         | StatefulSet   | Context cache + rate-limit store, PVC.       |
| `redpanda/`      | StatefulSet   | Kafka-compatible bus. Post-install topic Job.|
| `api/`           | Deployment    | Gateway. Pre-install schema-migration Job.   |
| `ingestion/`     | Deployment    | Kafka consumer → Postgres writer.            |
| `web/`           | Deployment    | Next.js UI. Traefik Ingress + TLS.           |

## Prerequisites

In the cluster, installed once and out of scope for these charts:

- **EKS cluster** — assumed `t3.medium` node group, min 2 / max 5 (open
  question in `progress-tracker.md`; adjust the node group to load).
- **EBS CSI driver** + a `gp3` StorageClass — backs every PVC.
- **metrics-server** — required by the HorizontalPodAutoscalers.
- **Traefik** — ingress controller (`ingressClassName: traefik`).
- **cert-manager** + a `ClusterIssuer` (e.g. `letsencrypt-prod`) — issues
  the web TLS certificate.
- **Container images** built and pushed to a registry (ECR):
  `helix/web`, `helix/api`, `helix/ingestion`, `helix/migrate`. Set
  `image.repository` / `image.tag` per chart to the real ECR paths.

Observability (Prometheus + Grafana) is **not** a chart here — install
`kube-prometheus-stack` instead. The api/ingestion pods carry
`prometheus.io/scrape` annotations, and the Grafana dashboards under
`infra/grafana/` can be imported into that stack.

## Install order

Data stores first, then the migration runs as an `api` pre-install hook,
then the services. Everything goes in the `helix` namespace.

```bash
kubectl create namespace helix

# 1. Data stores
helm install postgres infra/k8s/postgres -n helix
helm install redis    infra/k8s/redis    -n helix
helm install redpanda infra/k8s/redpanda -n helix   # topic Job runs post-install

# Wait for them to be Ready before continuing.
kubectl rollout status statefulset/postgres -n helix
kubectl rollout status statefulset/redpanda -n helix

# 2. Services — set real image + secret values.
helm install api infra/k8s/api -n helix \
  --set image.repository=<ecr>/helix-api --set image.tag=<sha> \
  --set migrate.image.repository=<ecr>/helix-migrate --set migrate.image.tag=<sha> \
  --set secrets.databaseUrl='postgres://helix:<pw>@postgres:5432/helix' \
  --set secrets.anthropicApiKey=<key> \
  --set secrets.openaiApiKey=<key> \
  --set secrets.googleApiKey=<key>

helm install ingestion infra/k8s/ingestion -n helix \
  --set image.repository=<ecr>/helix-ingestion --set image.tag=<sha> \
  --set secrets.databaseUrl='postgres://helix:<pw>@postgres:5432/helix'

helm install web infra/k8s/web -n helix \
  --set image.repository=<ecr>/helix-web --set image.tag=<sha> \
  --set ingress.host=<your-domain>
```

The `api` pre-install hook (`api-migrate` Job) runs `drizzle-kit push` +
the TimescaleDB hypertable SQL; its `backoffLimit` covers Postgres still
warming up. `redpanda`'s post-install hook creates the Kafka topics.

In production, prefer a `values-prod.yaml` per chart (or a CI pipeline)
over long `--set` lines, and source secrets from AWS Secrets Manager via
the External Secrets Operator rather than `--set`.

## Notes

- **Single-node data stores.** `postgres`, `redis`, and `redpanda` each
  run one replica. For HA, move to RDS / ElastiCache / MSK or a multi-node
  operator — see `progress-tracker.md`.
- **Ingestion autoscaling** is capped at the logs-topic partition count
  (a consumer group cannot use more consumers than partitions). KEDA with
  a Kafka consumer-lag trigger would scale on the real signal.
- **Only `web` is exposed.** `api` and `ingestion` are `ClusterIP` —
  the browser reaches the gateway only through the web app's own
  same-origin `/api/*` proxy.
