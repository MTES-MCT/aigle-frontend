import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // No token (local build, PR) → no upload, and the build still succeeds.
        process.env.SENTRY_AUTH_TOKEN
            ? sentryVitePlugin({
                  url: 'https://sentry.incubateur.net',
                  org: 'betagouv',
                  project: process.env.SENTRY_PROJECT,
                  authToken: process.env.SENTRY_AUTH_TOKEN,
                  // setCommits needs a Sentry↔GitHub repo integration we don't have,
                  // and the CI checkout is shallow — it would only ever warn.
                  release: { name: process.env.VITE_RELEASE, setCommits: false },
                  // dist/ is synced to a public bucket — maps go to Sentry only.
                  sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
                  telemetry: false,
                  // A Sentry hiccup must not block a deploy (default is to throw).
                  errorHandler: (err) => console.warn(err),
              })
            : undefined,
    ],
    build: {
        // 'hidden' = maps built for the Sentry upload, but no sourceMappingURL
        // comment pointing browsers at them. dist/ ends up in a public bucket.
        sourcemap: process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false,
    },
    resolve: {
        alias: [{ find: '@', replacement: '/src' }],
    },
    server: {
        fs: {
            cachedChecks: false,
        },
    },
});
