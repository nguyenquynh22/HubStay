const getKycSubmissionBlock = (isVerified, latestStatus) => {
  if (Number(isVerified) === 1 || latestStatus === "APPROVED") {
    return "VERIFIED";
  }
  if (latestStatus === "PENDING") return "PENDING";
  if (!latestStatus || latestStatus === "REJECTED") return null;
  return "UNAVAILABLE";
};

module.exports = { getKycSubmissionBlock };
