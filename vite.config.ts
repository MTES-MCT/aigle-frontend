import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, Plugin } from 'vite';

// Cette application est un mur de connexion, sur tous ses environnements : elle n'a rien
// à offrir à un moteur de recherche, et une preprod indexée annonce publiquement
// l'existence de l'environnement. Le site public indexable est l'autre projet
// (aigle-public-frontend, aigle.beta.gouv.fr), qui n'est pas concerné par ce plugin.
//
// Le noindex doit rester CRAWLABLE : un `Disallow: /` dans robots.txt empêcherait Google
// de lire la balise et figerait dans l'index les URLs déjà référencées au lieu de les
// retirer. La balise est dans le HTML statique, donc lue sans exécution de JS ; et comme
// le bucket sert index.html en page d'erreur, elle couvre aussi toutes les URLs inconnues.
const noindexPlugin = (): Plugin => ({
    name: 'aigle-noindex',
    transformIndexHtml: (html) =>
        html.replace('</head>', '        <meta name="robots" content="noindex, nofollow" />\n    </head>'),
});

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        noindexPlugin(),
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
