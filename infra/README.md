# infra — Infrastructure as Code

**Phase 6 target.** Terraform (or Pulumi) configurations for all cloud resources.

## Planned Resources

| Resource | Provider | Purpose |
|---|---|---|
| PostgreSQL | Neon.tech | Primary data store (dev, staging, prod branches) |
| Redis | Upstash | Cache + BullMQ queue (regional instances) |
| API server | Railway / Fly.io | Node.js backend (multi-region: us-east-1, eu-west-1, ap-south-1) |
| Web | Vercel | Next.js edge deployment |
| Object storage | Cloudflare R2 | QR images, user avatars, documents |
| DNS + CDN | Cloudflare | Load balancing, edge routing, DDoS protection |

## Structure (Phase 6)

```
infra/
├── terraform/
│   ├── main.tf           # Root module — provider configuration
│   ├── variables.tf      # Input variables
│   ├── outputs.tf        # Output values (URLs, connection strings)
│   ├── modules/
│   │   ├── neon/         # PostgreSQL databases + branches
│   │   ├── upstash/      # Redis instances
│   │   ├── railway/      # API + worker deployments
│   │   └── cloudflare/   # DNS, R2, Workers
│   └── environments/
│       ├── development.tfvars
│       ├── staging.tfvars
│       └── production.tfvars
└── README.md
```

## Prerequisites (Phase 6)

1. Install [Terraform CLI](https://developer.hashicorp.com/terraform/install) ≥ 1.6
2. Set environment variables: `NEON_API_KEY`, `UPSTASH_API_KEY`, `RAILWAY_TOKEN`, `CLOUDFLARE_API_TOKEN`
3. `cd infra/terraform && terraform init`
4. `terraform plan -var-file=environments/production.tfvars`
5. `terraform apply -var-file=environments/production.tfvars`

See `MIGRATION_ROADMAP.md` Phase 6 for full deployment runbook.
