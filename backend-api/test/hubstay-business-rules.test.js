const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAllowedPostTypes,
  validatePostTypeForRole,
} = require("../src/lib/post-permissions");
const {
  sortRecommendedPosts,
  getHomePageLimit,
} = require("../src/lib/home-recommendations");
const { isValidPassword } = require("../src/lib/password-policy");
const { getKycSubmissionBlock } = require("../src/lib/kyc-submission-policy");

test("role maps allowed post types", () => {
  assert.deepEqual(getAllowedPostTypes("LANDLORD"), ["RENTAL"]);
  assert.deepEqual(getAllowedPostTypes("STUDENT"), ["SHARE", "PASS", "FIND"]);
  assert.deepEqual(getAllowedPostTypes("WORKER"), ["SHARE", "PASS", "FIND"]);
  assert.equal(validatePostTypeForRole("LANDLORD", "RENTAL"), true);
  assert.equal(validatePostTypeForRole("STUDENT", "RENTAL"), false);
});

test("VIP posts are prioritized before nearby ordinary posts and new posts", () => {
  const posts = [
    {
      post_id: 1,
      is_vip_active: 0,
      is_verified_active: 0,
      created_at: "2026-10-01T00:00:00Z",
      distance_km: 2,
    },
    {
      post_id: 2,
      is_vip_active: 1,
      is_verified_active: 0,
      created_at: "2026-10-02T00:00:00Z",
      distance_km: 5,
    },
    {
      post_id: 3,
      is_vip_active: 0,
      is_verified_active: 1,
      created_at: "2026-10-03T00:00:00Z",
      distance_km: 1,
    },
  ];

  assert.deepEqual(
    sortRecommendedPosts(posts).map((post) => post.post_id),
    [2, 3, 1],
  );
});

test("home page uses a five-item limit and supports no-results fallback", () => {
  assert.equal(getHomePageLimit(), 5);
  assert.deepEqual(sortRecommendedPosts([]), []);
});

test("password policy requires mixed case, a number, a symbol, and bcrypt-safe length", () => {
  assert.equal(isValidPassword("Aa1!aaaa"), true);
  assert.equal(isValidPassword("Aa1!aaa"), false);
  assert.equal(isValidPassword("aa1!aaaa"), false);
  assert.equal(isValidPassword("AA1!AAAA"), false);
  assert.equal(isValidPassword("Aaa!aaaa"), false);
  assert.equal(isValidPassword("Aa11aaaa"), false);
  assert.equal(isValidPassword(`Aa1!${"a".repeat(68)}`), true);
  assert.equal(isValidPassword(`Aa1!${"a".repeat(67)}é`), false);
});

test("KYC submission is allowed only initially or after rejection", () => {
  assert.equal(getKycSubmissionBlock(0, undefined), null);
  assert.equal(getKycSubmissionBlock(0, "REJECTED"), null);
  assert.equal(getKycSubmissionBlock(0, "PENDING"), "PENDING");
  assert.equal(getKycSubmissionBlock(1, "REJECTED"), "VERIFIED");
  assert.equal(getKycSubmissionBlock(0, "APPROVED"), "VERIFIED");
  assert.equal(getKycSubmissionBlock(0, "OTHER"), "UNAVAILABLE");
});
