
window.addEventListener('error', (event) => {
    fetch('http://127.0.0.1:8080/api/log', {
        method: 'POST',
        body: JSON.stringify({
            type: 'UNHANDLED_ERROR',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error ? event.error.stack : null
        })
    }).catch(() => {});
});

window.addEventListener('unhandledrejection', (event) => {
    fetch('http://127.0.0.1:8080/api/log', {
        method: 'POST',
        body: JSON.stringify({
            type: 'UNHANDLED_REJECTION',
            reason: event.reason ? (event.reason.stack || event.reason.message || String(event.reason)) : null
        })
    }).catch(() => {});
});

window.debugLog = (tag, data) => {
    fetch('http://127.0.0.1:8080/api/log', {
        method: 'POST',
        body: JSON.stringify({ tag, data, time: Date.now() })
    }).catch(() => {});
};

// Copyright (C) 2017-2023 Smart code 203358507

if (typeof process.env.SENTRY_DSN === 'string') {
    const Sentry = require('@sentry/browser');
    Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const Bowser = require('bowser');
const browser = Bowser.parse(window.navigator?.userAgent || '');
if (browser?.platform?.type === 'desktop') {
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', '');
}

const React = require('react');
const ReactDOM = require('react-dom/client');
const { HashRouter } = require('react-router-dom');
const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');
const stremioTranslations = require('stremio-translations');
const App = require('./App');
const { default: WebUpdateScreen } = require('./App/WebUpdateScreen');
const { CoreProvider } = require('./core');
const { FileDropProvider, PlatformProvider } = require('./common');

const translations = Object.fromEntries(Object.entries(stremioTranslations()).map(([key, value]) => [key, {
    translation: value
}]));

i18n
    .use(initReactI18next)
    .init({
        resources: translations,
        lng: 'en-US',
        fallbackLng: 'en-US',
        interpolation: {
            escapeValue: false
        }
    });

const appInfo = {
    appVersion: process.env.VERSION,
    shellVersion: null
};

const root = ReactDOM.createRoot(document.getElementById('app'));
window.debugLog && window.debugLog('APP_LOADED_LOG', { href: window.location.href, hash: window.location.hash });
root.render(
    <React.StrictMode>
        <PlatformProvider>
            <CoreProvider appInfo={appInfo}>
                <FileDropProvider>
                    <HashRouter>
                        <>
                            <WebUpdateScreen />
                            <App />
                        </>
                    </HashRouter>
                </FileDropProvider>
            </CoreProvider>
        </PlatformProvider>
    </React.StrictMode>
);
