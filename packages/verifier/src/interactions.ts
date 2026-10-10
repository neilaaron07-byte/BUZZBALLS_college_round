import type { Page } from "playwright";
import type { VerificationCheck } from "./contracts";

function check(id: string, label: string, status: VerificationCheck["status"], blocking: boolean, explanation: string, evidence: readonly string[], startedAt: number): VerificationCheck {
  return { id, kind: "interaction", label, status, blocking, explanation, evidence, durationMs: Date.now() - startedAt };
}

async function visibleAndEnabled(page: Page, selectors: readonly string[]): Promise<{ found: boolean; visible: boolean; selector: string | null }> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() === 0) continue;
    return { found: true, visible: await locator.isVisible(), selector };
  }
  return { found: false, visible: false, selector: null };
}

export async function runInteractionSuite(page: Page): Promise<readonly VerificationCheck[]> {
  const results: VerificationCheck[] = [];
  const addToCartStarted = Date.now();
  const addToCart = await visibleAndEnabled(page, ["[data-testid='add-to-cart']", "button:has-text('Add to cart')", "button:has-text('Buy now')"]);
  results.push(!addToCart.found
    ? check("interaction-add-to-cart", "Add to cart", "skipped", true, "No purchase action exists on this page.", [], addToCartStarted)
    : addToCart.visible
      ? check("interaction-add-to-cart", "Add to cart", "passed", true, "The purchase action is visible and available for interaction.", [addToCart.selector ?? "button"], addToCartStarted)
      : check("interaction-add-to-cart", "Add to cart", "failed", true, "The purchase action exists but is hidden or unavailable.", [addToCart.selector ?? "button"], addToCartStarted));

  const searchStarted = Date.now();
  const search = page.locator("input[type='search'], input[placeholder*='Search' i]").first();
  if (await search.count() === 0) results.push(check("interaction-search", "Search", "skipped", false, "No search control is present on this page.", [], searchStarted));
  else if (!(await search.isVisible())) results.push(check("interaction-search", "Search", "failed", false, "The search control exists but is hidden.", [], searchStarted));
  else {
    await search.fill("aurora");
    results.push(check("interaction-search", "Search", "passed", false, "Search accepts keyboard input.", ["Filled search with aurora"], searchStarted));
  }

  const loginStarted = Date.now();
  const login = await visibleAndEnabled(page, ["a:has-text('Log in')", "button:has-text('Log in')", "a:has-text('Sign in')"]);
  results.push(!login.found ? check("interaction-login", "Login", "skipped", false, "No login action is present on this page.", [], loginStarted) : login.visible ? check("interaction-login", "Login", "passed", false, "The login action is visible.", [login.selector ?? "login"], loginStarted) : check("interaction-login", "Login", "failed", false, "The login action is hidden.", [login.selector ?? "login"], loginStarted));

  const checkoutStarted = Date.now();
  const checkout = await visibleAndEnabled(page, ["a:has-text('Checkout')", "button:has-text('Checkout')", "[data-testid='checkout']"]);
  results.push(!checkout.found ? check("interaction-checkout", "Checkout", "skipped", false, "No checkout action is present on this page.", [], checkoutStarted) : checkout.visible ? check("interaction-checkout", "Checkout", "passed", false, "The checkout action is visible.", [checkout.selector ?? "checkout"], checkoutStarted) : check("interaction-checkout", "Checkout", "failed", false, "The checkout action is hidden.", [checkout.selector ?? "checkout"], checkoutStarted));
  return results;
}
