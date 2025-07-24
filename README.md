## Getting Started

### Install dependencies
```bash
npm install
```

### Configure Environment
copy .env.example to .env and fill out as needed 

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Deploying in production
Make sure to deploy the latest commit/docker image.

Look carefully at the `.env.example` (or `.env-docker.example` if using docker) provided, Copy to `.env` (`.env-docker`) and fill out the variables as needed. 

A common mistake is to not change the `APP_CALLBACK_URL`, which should be the domain that the portal is deployed to, not `localhost`.

Make sure that the `APP_CALLBACK_URL` is registered with the OAuth2/OIDC provider, so that it will properly redirect. Without this the Portal will not work. 



