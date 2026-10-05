export default async function run(page) {
  await page
    .getByPlaceholder("you@example.com")
    .fill("home-search-1791217715091@example.test");
  await page.getByPlaceholder("Nhập mật khẩu").fill("HubStay-QA-2026!");
  await page.getByText("Đăng nhập", { exact: true }).click();

  const search = page.getByPlaceholder("Tìm trường, bệnh viện, địa điểm...");
  await search.waitFor({ state: "visible", timeout: 30000 });
  await search.fill("Bách Khoa");
  const landmark = page.getByText("Đại học Bách Khoa Hà Nội", { exact: true });
  await landmark.waitFor({ state: "visible", timeout: 15000 });
  const suggestionVisible = await landmark.isVisible();

  await page.getByText("Tỉnh / thành phố", { exact: true }).click();
  await page
    .getByText("Thành phố Hà Nội", { exact: true })
    .waitFor({ state: "visible", timeout: 15000 });
  return {
    homeLoaded: true,
    landmarkSuggestionVisible: suggestionVisible,
    provinceOptionsLoaded: true,
  };
}
