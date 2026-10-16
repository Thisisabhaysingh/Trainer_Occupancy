const { getCentralInventoryConfig } = require("./centralInventory.config");

const firstString = (...values) => values.find((value) => typeof value === "string" && value.trim());

const imageCandidate = (item = {}) => firstString(
  item.imageUrl,
  item.image_url,
  item.thumbnailUrl,
  item.thumbnail_url,
  item.photoUrl,
  item.photo_url,
  typeof item.image === "string" ? item.image : item.image?.url,
  typeof item.thumbnail === "string" ? item.thumbnail : item.thumbnail?.url,
  typeof item.media === "string" ? item.media : item.media?.url,
  typeof item.images?.[0] === "string" ? item.images[0] : item.images?.[0]?.url,
  item.item?.imageUrl,
  item.item?.image_url,
);

const normalizedAllowedHosts = (config) => {
  const hosts = new Set(config.imageHosts || []);
  try {
    hosts.add(new URL(config.baseUrl).hostname.toLowerCase());
  } catch (_error) {
    // Invalid base URLs are handled by the adapter configuration checks.
  }
  return [...hosts];
};

const hostAllowed = (hostname, allowedHosts) => allowedHosts.some((allowed) => {
  const normalized = allowed.replace(/^\*\./, "").replace(/^\./, "");
  return hostname === normalized || hostname.endsWith(`.${normalized}`);
});

const validateImageUrl = (value, config = getCentralInventoryConfig()) => {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim(), config.baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!hostAllowed(url.hostname.toLowerCase(), normalizedAllowedHosts(config))) return null;
    return url.href;
  } catch (_error) {
    return null;
  }
};

const normalizeItemImage = (item, config) => ({
  ...item,
  imageUrl: validateImageUrl(imageCandidate(item), config),
});

const normalizeCentralInventoryImages = (payload, config = getCentralInventoryConfig()) => {
  if (Array.isArray(payload)) return payload.map((item) => normalizeItemImage(item, config));
  if (!payload || typeof payload !== "object") return payload;
  for (const key of ["items", "serials", "data"]) {
    if (Array.isArray(payload[key])) return { ...payload, [key]: payload[key].map((item) => normalizeItemImage(item, config)) };
  }
  return normalizeItemImage(payload, config);
};

module.exports = { imageCandidate, validateImageUrl, normalizeCentralInventoryImages };
