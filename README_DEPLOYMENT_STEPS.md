## Ottehr Intake Portal new version deployment

Further:
{env} is local, dev or prod
{environment} is local, development or production

- [] Prepare files with environment variables
  - For zambdas:
    - `packages/zambdas/.env/local.json`
    - `packages/zambdas/.env/development.json`
    - `packages/zambdas/.env/production.json`
  - For Intake Portal app:
    - `apps/intake/env/.env.local`
    - `apps/intake/env/.env.development`
    - `apps/intake/env/.env.production`

- Switch to release branch

```bash
git switch {release-branch-name}
```

- Pull last changes from repository

```bash
git pull
```

- Go to zambdas folder

```bash
cd packages/zambdas/
```

- Export previous version zambdas logs

```bash
npm run get-zambdas-logs:{env}
```

- Check files with logs in the folder:
  - `packages/zambdas/.dist/logs-{env}`

- Save files to some data storage

- Add prefix to old zambdas in dry-run mode (verify first)
  - {environment} is local, development or production

```bash
ENV={environment} npm run prefix-zambdas -- --prefix=my-prefix --dry-run
```

- Check the list of zambdas that will be prefixed in terminal logs

- Add prefix to old zambdas (apply changes)

```bash
ENV={environment} npm run prefix-zambdas -- --prefix=my-prefix
```

- Go to Oystehr console and check renamed zambdas

- Deploy zambdas of new version (check packages/zambdas/src/scripts/deploy-zambdas.ts and packages/zambdas/bundle.ts to use /config/oystehr/ottehr-spec.json)

```bash
npm run deploy-zambdas:{env}
```

- Go to Oystehr console and check deployed zambdas

- Delete prefixed zambdas in dry-run mode (verify first)
  - {environment} is local, development or production

```bash
ENV={environment} npm run delete-prefixed-zambdas -- --prefix=my-prefix --dry-run
```

- Check the list of zambdas that will be deleted in terminal logs

- Delete prefixed zambdas (apply changes)

```bash
ENV={environment} npm run delete-prefixed-zambdas -- --prefix=my-prefix
```

- Go to Intake Portal application folder

```bash
cd ../../apps/intake
```

- Set authenticated connection to AWS

- Deploy Intake app to AWS

```bash
npm run ci-deploy:{environment}
```

- Open site in browser and check if it works
