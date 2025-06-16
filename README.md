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


## Docker
### Handling Environment Variables in Docker
SvelteKit provides four different ways to import environment variables, let’s break down how each of these interact with Docker.

> #### $env/dynamic/private
The dynamic private import allows you to have _runtime_ environment variables. The upside with this sort of variable is:

They don’t have to be defined at build time
They can be easily changed at any point (for example, updating a secret API key)
Runtime variables can be set in different ways:

Hard coded in the Dockerfile:
```docker
ENV API_SECRET=secret
```
Passed when running the container:
```bash
docker run -e API_SECRET=secret my-sveltekit-app
```
Used with a .env file:
```bash
docker run --env-file .env my-sveltekit-app
```
Keep in mind these variables are not available during prerendering, so don’t use them in pages that are prerendered.

> #### $env/dynamic/public
These are similar to private dynamic variables, but they’re exposed to the client. They should start with PUBLIC_ (by default). Handle them the same way as private dynamic variables.


> #### $env/static/private

These environment variables are build time variables. That means they need to be accessible when you are building your application. These variables will be baked into your Docker image. This can be problematic because:

Any secrets you put here will be part of your image
You cannot easily rotate any of these keys, a full rebuild of the image is required.
To use static variables:

Add a build argument in your Dockerfile:
ARG API_KEY
Pass the build argument when building the image using --build-arg
docker build --build-arg API_KEY=your_api_key -t my-sveltekit-app .

> #### $env/static/public
These are similar to static private variables but are exposed to the client and should start with PUBLIC_ (by default). Handle them the same way as static private variables.

Static public variables have an important use case – if you are building your SvelteKit application with adapter-static (to make a SPA), then you cannot use private environment variables, and since your whole application is static, you will need to rebuild it regardless of the change you want to make, so static public variables are very useful to easily be able to change how the application is configured.

[credit](https://khromov.se/dockerizing-your-sveltekit-applications-a-practical-guide/)

### Setting the ORIGIN variable