import { useEffect } from 'react';

const SITE_NAME = 'CareerHub';
const BASE_TITLE = 'CareerHub — Next Generation Career Platform';

/** Sets the document title per page (falls back to the base title). */
export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : BASE_TITLE;
    return () => { document.title = BASE_TITLE; };
  }, [title]);
}
