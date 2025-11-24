GitHub Actions → AWS (OIDC) setup

This document explains how to configure GitHub Actions to assume an AWS IAM role via OpenID Connect (OIDC). It shows what to create on the AWS side and what to configure in GitHub. Follow these steps to enable short-lived, secure credentials for CI/CD without storing long-lived AWS keys in GitHub.

Checklist
- Create (or verify) the GitHub OIDC identity provider in AWS
- Create an IAM role with a trust policy allowing GitHub Actions to assume it
- Attach a least-privilege IAM policy (S3 + CloudFront example included)
- Add repository Environments and environment secrets in GitHub
- Update the GitHub Actions workflow to request id-token permissions and use OIDC
- Test with a small workflow that runs aws sts get-caller-identity

1) Prerequisites
- AWS account ID and permissions to create IAM roles and policies
- GitHub repository admin permissions
- Target S3 bucket and CloudFront distribution ID for the Intake app
- Decide on environment names (e.g., development, production)

2) Add/verify the GitHub OIDC provider in AWS
- In most AWS accounts the OIDC provider for GitHub Actions is already present. If not:
  - Console: IAM → Identity providers → Add provider
  - Provider type: OpenID Connect
  - Provider URL: https://token.actions.githubusercontent.com
  - Audience: sts.amazonaws.com

3) Create an IAM role for GitHub Actions (OIDC trust)
- Console: IAM → Roles → Create role
  - Trusted entity type: Web identity
  - Identity provider: token.actions.githubusercontent.com
  - Audience: sts.amazonaws.com
- Add a trust policy that limits which repository (and optionally branch) can assume the role.

Example trust policy (replace account ID and owner/repo):

```bash
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:owner/repo:*"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

Notes:
- To restrict to a single branch (e.g. main) use:
  "token.actions.githubusercontent.com:sub": "repo:owner/repo:ref:refs/heads/main"
- Tighten conditions as needed for security (actor, workflow, ref).

4) Attach an IAM policy (least-privilege example)
- Create an IAM policy that grants only the permissions required for your deployment.
- Example S3 + CloudFront policy (replace bucket and distribution ID):

```bash
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3PutAndList",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-intake-bucket",
        "arn:aws:s3:::your-intake-bucket/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListDistributions"
      ],
      "Resource": "*"
    }
  ]
}
```

Notes:
- CloudFront actions may require "*" for Resource; limit via other means when possible.
- Scope S3 to the exact bucket and prefix.

5) Record the role ARN
- Copy the created role ARN (e.g., arn:aws:iam::123456789012:role/gh-actions-deploy-role). This will be stored in GitHub.

6) Configure GitHub Environments & secrets
- GitHub: Repository → Settings → Environments
- Create an environment named the same as your deployment environment (e.g., development)
- Add secrets (Environment secrets):
  - AWS_ROLE_TO_ASSUME: arn:aws:iam::123456789012:role/gh-actions-deploy-role
  - AWS_REGION: us-east-1
  - S3_BUCKET: your-intake-bucket
  - CLOUDFRONT_DISTRIBUTION_ID: E123ABC45DEF6
  - For Zambda scripts: PROJECT_API, PROJECT_ACCESS_TOKEN, PROJECT_ID
- Repeat for production with production-specific values. Use protected environments for production (required reviewers).

7) Update GitHub Actions workflow to use OIDC
- Ensure the job requests id-token permission and the job environment matches the GitHub Environment you added.
- Use aws-actions/configure-aws-credentials@v2 to assume the role via OIDC.

Example job snippet:

```bash
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    environment: ${{ github.event.inputs.environment }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Create env file and deploy
        run: |
          mkdir -p apps/intake/env
          cat > apps/intake/env/.env.${{ github.event.inputs.environment }} <<'EOF'
          CLOUDFRONT_DISTRIBUTION_ID=${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
          S3_BUCKET=${{ secrets.S3_BUCKET }}
          EOF

          cd apps/intake
          ENV=${{ github.event.inputs.environment }} npm run ci-deploy:${{ github.event.inputs.environment }}
```

Key points:
- The job must have "permissions: id-token: write" so GitHub issues an OIDC token.
- Using GitHub Environments keeps secrets scoped and allows required reviewers for production runs.

8) Quick test workflow
- Create a short workflow to verify the role assumption and identity:

```bash
jobs:
  test-oidc:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Verify identity
        run: aws sts get-caller-identity
```

- Run the workflow via the GitHub UI (Actions → Run workflow). If configured correctly, "aws sts get-caller-identity" returns the assumed role's ARN and account ID.

9) Troubleshooting
- "AccessDenied" or cannot assume role:
  - Check IAM role trust policy reviewer: the OIDC provider ARN and conditions must match the repo.
  - Confirm the role ARN is correct and stored in ${{ secrets.AWS_ROLE_TO_ASSUME }} for the selected Environment.
  - Confirm the workflow has "permissions: id-token: write".

- "Invalid identity token" or aud claim errors:
  - Confirm the trust Condition contains "token.actions.githubusercontent.com:aud": "sts.amazonaws.com".

- Missing secret or secret not available:
  - Ensure you're running the workflow with the correct environment name so the environment secrets are accessible.

10) Security recommendations
- Use GitHub Environments with required reviewers for production.
- Restrict the trust policy to the specific repo and branch when possible.
- Lock down S3 actions to a specific bucket and prefix.
- Monitor role usage with CloudTrail.

11) Automating role creation (optional)
- Consider creating the role and policy via Terraform or CloudFormation and storing the templates in this repo. Do not store secrets in version control.

12) Cleanup
- After testing, tighten the trust policy and IAM policy to match your security posture.
