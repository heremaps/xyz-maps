declare module 'virtual:xyz-libs' {
    const libs: import('./types').LibraryBundle[];
    export default libs;
}

declare const __XYZ_COMPONENT__: import('./types').Component;
declare const __XYZ_MAP__: import('./types').MapMarkup;
declare var here: import('./types').XYZGlobalNamespace | undefined;
// eslint-disable-next-line camelcase
declare var __XYZTST_MVCEDelayMs: number | undefined;
