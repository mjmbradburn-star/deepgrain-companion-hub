import { useEffect } from "react";
import { OG_IMAGE, SITE_NAME, canonicalUrl, type SeoConfig } from "@/lib/seo";

interface SeoProps extends Partial<SeoConfig> {
  jsonLd?: Array<Record<string, unknown>>;
  image?: string;
  imageAlt?: string;
}

function setMeta(selector: string, attr: "content" | "href", value: string, create?: () => HTMLMetaElement | HTMLLinkElement) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el && create) {
    el = create();
    document.head.appendChild(el);
  }
  if (el) el.setAttribute(attr, value);
}

function metaName(name: string) {
  return () => {
    const el = document.createElement("meta");
    el.setAttribute("name", name);
    return el;
  };
}

function metaProperty(property: string) {
  return () => {
    const el = document.createElement("meta");
    el.setAttribute("property", property);
    return el;
  };
}

export function Seo({
  title = SITE_NAME,
  description = "The AI Operating Index by Deepgrain.",
  path = "/",
  noindex = false,
  type = "website",
  jsonLd = [],
  image = OG_IMAGE,
  imageAlt = "AI Operating Index by Deepgrain",
}: SeoProps) {
  useEffect(() => {
    const url = canonicalUrl(path);
    document.title = title;
    setMeta('meta[name="description"]', "content", description, metaName("description"));
    setMeta('meta[name="author"]', "content", "Deepgrain", metaName("author"));
    setMeta('meta[name="robots"]', "content", noindex ? "noindex,nofollow" : "index,follow", metaName("robots"));
    setMeta('meta[name="theme-color"]', "content", "#F5EFE0", metaName("theme-color"));
    setMeta('link[rel="canonical"]', "href", url, () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    });

    setMeta('meta[property="og:type"]', "content", type, metaProperty("og:type"));
    setMeta('meta[property="og:site_name"]', "content", SITE_NAME, metaProperty("og:site_name"));
    setMeta('meta[property="og:title"]', "content", title, metaProperty("og:title"));
    setMeta('meta[property="og:description"]', "content", description, metaProperty("og:description"));
    setMeta('meta[property="og:url"]', "content", url, metaProperty("og:url"));
    setMeta('meta[property="og:image"]', "content", image, metaProperty("og:image"));
    setMeta('meta[property="og:image:width"]', "content", "1200", metaProperty("og:image:width"));
    setMeta('meta[property="og:image:height"]', "content", "630", metaProperty("og:image:height"));
    setMeta('meta[property="og:image:alt"]', "content", imageAlt, metaProperty("og:image:alt"));

    setMeta('meta[name="twitter:card"]', "content", "summary_large_image", metaName("twitter:card"));
    setMeta('meta[name="twitter:title"]', "content", title, metaName("twitter:title"));
    setMeta('meta[name="twitter:description"]', "content", description, metaName("twitter:description"));
    setMeta('meta[name="twitter:image"]', "content", image, metaName("twitter:image"));
    setMeta('meta[name="twitter:image:alt"]', "content", imageAlt, metaName("twitter:image:alt"));

    document.querySelectorAll('script[data-aioi-jsonld="true"]').forEach((el) => el.remove());
    jsonLd.forEach((schema) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.aioiJsonld = "true";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });
  }, [description, image, imageAlt, jsonLd, noindex, path, title, type]);

  return null;
}