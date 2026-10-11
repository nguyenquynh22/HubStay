const HOME_PAGE_LIMIT = 5;

function sortRecommendedPosts(posts, { userArea = null } = {}) {
  const items = Array.isArray(posts) ? posts : [];

  return items.slice().sort((a, b) => {
    const vipDifference =
      Number(b.is_vip_active ?? 0) - Number(a.is_vip_active ?? 0);
    if (vipDifference !== 0) return vipDifference;

    const verifiedDifference =
      Number(b.is_verified_active ?? 0) - Number(a.is_verified_active ?? 0);
    if (verifiedDifference !== 0) return verifiedDifference;

    const distanceDifference =
      Number(a.distance_km ?? Number.MAX_SAFE_INTEGER) -
      Number(b.distance_km ?? Number.MAX_SAFE_INTEGER);
    if (distanceDifference !== 0) return distanceDifference;

    if (userArea && Number(a.distance_km ?? 0) === Number(b.distance_km ?? 0)) {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

function getHomePageLimit() {
  return HOME_PAGE_LIMIT;
}

module.exports = {
  HOME_PAGE_LIMIT,
  getHomePageLimit,
  sortRecommendedPosts,
};
