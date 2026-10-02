import { expect, test } from "@playwright/test";

test.describe("landing smoke", () => {
  test("home page shows product name and auth CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /AI RepoSense/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  });

  test("login page is reachable", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: /Get Started with Us/i }),
    ).toBeVisible();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});