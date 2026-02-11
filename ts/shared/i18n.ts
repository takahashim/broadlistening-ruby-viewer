/**
 * I18n helper for Broadlistening View
 *
 * Reads localized strings directly from a data attribute set by Rails.
 * Simple and reliable - no timing dependencies.
 *
 * See: config/locales/*.yml for message definitions
 */

import type { I18nMessages } from "./types";

/**
 * Get all broadlistening_view messages from DOM
 */
const getViewMessages = (): I18nMessages => {
  const element = document.getElementById("broadlistening-view-i18n");
  if (!element || !(element as HTMLElement).dataset.messages) {
    return {};
  }

  try {
    return JSON.parse((element as HTMLElement).dataset.messages!) as I18nMessages;
  } catch (e) {
    console.error("[broadlistening_view] Failed to parse i18n messages:", e);
    return {};
  }
};

/**
 * Get a translated message by key
 */
export const t = (key: string, interpolations: Record<string, string | number> = {}): string => {
  const messages = getViewMessages();

  // Navigate to the nested key
  let value: I18nMessages | string | undefined = messages;
  for (const part of key.split(".")) {
    if (value && typeof value === "object") {
      value = (value as I18nMessages)[part];
    } else {
      value = undefined;
      break;
    }
  }

  // If not found, return the key itself as fallback
  if (value == null) {
    console.warn(`[broadlistening_view] Missing translation: ${key}`);
    return key;
  }

  // Handle interpolations (e.g., %{count})
  if (typeof value === "string" && Object.keys(interpolations).length > 0) {
    return value.replace(/%\{(\w+)\}/g, (match: string, name: string) => {
      return interpolations[name] !== undefined ? String(interpolations[name]) : match;
    });
  }

  return String(value);
};
