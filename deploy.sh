#!/usr/bin/env bash
#
# Releases the kit: deploys the stacks that serve agentrite.ritenoar.com, packs the
# kit at the version in package.json, and uploads the tarball under that version's
# name. A released name is never replaced, because consumers' lockfiles pin it by
# integrity hash, so bump the version with `npm version` before every release.
# A version whose release notes are missing from CHANGELOG.md is refused before
# anything else is done.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export AWS_PAGER=""

REGION="eu-west-1"
CERT_STACK="AgentRiteCertStack"
HOSTING_STACK="AgentRiteHostingStack"

cd "$ROOT"

VERSION="$(node -p 'JSON.parse(require("node:fs").readFileSync("package.json", "utf8")).version')"
if ! grep -qxF "## $VERSION" CHANGELOG.md 2>/dev/null; then
  echo "✗ CHANGELOG.md has no section headed \"## $VERSION\". Write the release notes as AGENTS.md" >&2
  echo "  describes under \"Release notes\", commit them, and run this again." >&2
  exit 1
fi

if ! aws sts get-caller-identity &>/dev/null; then
  echo "▶ AWS SSO login"
  aws sso login
fi

# npm ci, not npm install, so that the lockfile is an input to the release rather
# than something it rewrites.
npm ci

echo "▶ Type-checking the infrastructure and testing the kit"
npx tsc -p infra
npm test

echo "▶ Deploying CDK stacks"
(cd infra && npx cdk deploy "$CERT_STACK" "$HOSTING_STACK" --require-approval broadening)

stack_output() {
  aws cloudformation describe-stacks \
    --stack-name "$HOSTING_STACK" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}
BUCKET="$(stack_output BucketName)"
BASE_URL="$(stack_output BaseUrl)"

echo "▶ Packing the kit"
pack_dir="$(mktemp -d)"
trap 'rm -rf "$pack_dir"' EXIT
pack_json="$(npm pack --pack-destination "$pack_dir" --json)"
pack_field() {
  node -e 'console.log(JSON.parse(process.argv[1])[0][process.argv[2]])' "$pack_json" "$1"
}
PACKAGE="$(pack_field name)"
TARBALL="$(pack_field filename)"
URL="$BASE_URL/$TARBALL"

if head_error="$(aws s3api head-object --bucket "$BUCKET" --key "$TARBALL" 2>&1 >/dev/null)"; then
  echo "✗ $TARBALL is already released and is never replaced. Bump the version with" >&2
  echo "  npm version patch|minor|major, then run this again." >&2
  exit 1
elif [[ "$head_error" != *"Not Found"* ]]; then
  echo "✗ Could not check whether $TARBALL is already released:" >&2
  echo "$head_error" >&2
  exit 1
fi

echo "▶ Uploading $TARBALL"
aws s3 cp "$pack_dir/$TARBALL" "s3://$BUCKET/$TARBALL" \
  --content-type application/gzip \
  --cache-control "public, max-age=31536000, immutable"

echo "▶ Checking $URL is served without credentials"
status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$URL" || true)"
if [[ "$status" != "200" ]]; then
  echo "✗ $URL answered ${status:-nothing}, not 200" >&2
  exit 1
fi

echo "✓ Released. In a consuming project's package.json:"
echo "  \"$PACKAGE\": \"$URL\""
