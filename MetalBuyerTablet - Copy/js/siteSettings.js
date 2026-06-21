import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const moduleBackgroundsRef = doc(db, "siteSettings", "moduleBackgrounds");
const brandingRef = doc(db, "siteSettings", "branding");

export async function initSiteSettings() {
  try {
    const [backgroundSnapshot, brandingSnapshot] = await Promise.all([
      getDoc(moduleBackgroundsRef),
      getDoc(brandingRef)
    ]);

    if (backgroundSnapshot.exists()) {
      applyModuleBackgrounds(backgroundSnapshot.data());
    }

    if (brandingSnapshot.exists()) {
      applyBrandingSettings(brandingSnapshot.data());
    }
  } catch (error) {
    console.error("Site settings error:", error);
  }
}

function applyModuleBackgrounds(settings) {
  ["hero", "kvitel", "donate", "pushka", "contact"].forEach(pageId => {
    const page = document.getElementById(pageId);
    const imageUrl = settings[pageId];

    if (!page) return;

    page.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : "";
  });
}

function applyBrandingSettings(settings) {
  const logo = document.getElementById("siteLogo");
  const logoText = document.getElementById("siteLogoText");
  const logoUrl = settings.logoUrl;

  if (!logo || !logoText) return;

  if (logoUrl) {
    logo.src = logoUrl;
    logo.classList.remove("hidden");
    logoText.classList.add("hidden");
  } else {
    logo.removeAttribute("src");
    logo.classList.add("hidden");
    logoText.classList.remove("hidden");
  }
}
