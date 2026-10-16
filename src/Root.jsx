import { lazy, Suspense, useSyncExternalStore } from 'react';

// Phones get the v3 mobile design; tablets and desktops keep the sidebar layout.
// Each layout is loaded lazily so its global CSS only ships to the screens that use it.
const MOBILE_QUERY = '(max-width: 760px)';
const DesktopApp = lazy(() => import('./App.jsx'));
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'));

const mql = window.matchMedia(MOBILE_QUERY);
const subscribe = (cb) => {
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};

export default function Root() {
  const mobile = useSyncExternalStore(subscribe, () => mql.matches);
  return <Suspense fallback={null}>{mobile ? <MobileApp /> : <DesktopApp />}</Suspense>;
}
