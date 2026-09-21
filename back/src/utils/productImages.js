function normalizeProductImages(input = {}) {
  const body = { ...input };
  let urls = Array.isArray(body.imageUrls)
    ? body.imageUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];

  const legacy = String(body.imageUrl || '').trim();
  if (legacy && !urls.includes(legacy)) {
    urls.unshift(legacy);
  }

  body.imageUrls = urls;
  body.imageUrl = urls[0] || null;
  return body;
}

function withProductImages(product) {
  const json = product.toJSON ? product.toJSON() : { ...product };
  return normalizeProductImages(json);
}

module.exports = {
  normalizeProductImages,
  withProductImages,
};
