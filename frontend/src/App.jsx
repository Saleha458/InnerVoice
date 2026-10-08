
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import AppRoutes from "./routes/AppRoutes";

import {
  NotificationProvider,
} from "./context/NotificationContext";

const SITE_URL =
  "https://innervoice.salehaimtiaz.com/";

const HOME_TITLE =
  "InnerVoice | Privacy-First Wellbeing & AI Support";

const HOME_DESCRIPTION =
  "InnerVoice is a privacy-first wellbeing platform combining anonymous self-reflection, AI support, verified expert access, and evidence-backed parent guidance.";

function setMeta(name, value) {
  let element = document.querySelector(
    `meta[name="${name}"]`
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", value);
}

function updateCanonical(isHome) {
  let canonical = document.querySelector(
    'link[rel="canonical"]'
  );

  if (!isHome) {
    canonical?.remove();
    return;
  }

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }

  canonical.href = SITE_URL;
}

function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isHome = pathname === "/";

    document.title = isHome
      ? HOME_TITLE
      : "InnerVoice";

    setMeta(
      "robots",
      isHome
        ? "index, follow"
        : "noindex, nofollow"
    );

    setMeta(
      "description",
      isHome
        ? HOME_DESCRIPTION
        : "InnerVoice is a privacy-first wellbeing platform."
    );

    updateCanonical(isHome);

    const ogUrl = document.querySelector(
      'meta[property="og:url"]'
    );

    if (ogUrl) {
      ogUrl.setAttribute(
        "content",
        isHome
          ? SITE_URL
          : window.location.origin + pathname
      );
    }
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <NotificationProvider>
      <SeoManager />
      <AppRoutes />
    </NotificationProvider>
  );
}
