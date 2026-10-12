const POST_TYPE_PERMISSION = {
  LANDLORD: ["RENTAL"],
  STUDENT: ["SHARE", "PASS", "FIND"],
  WORKER: ["SHARE", "PASS", "FIND"],
};

function getAllowedPostTypes(role) {
  if (typeof role !== "string") return [];
  return [...(POST_TYPE_PERMISSION[role] ?? [])];
}

function validatePostTypeForRole(role, postType) {
  return getAllowedPostTypes(role).includes(postType);
}

module.exports = {
  getAllowedPostTypes,
  validatePostTypeForRole,
};
