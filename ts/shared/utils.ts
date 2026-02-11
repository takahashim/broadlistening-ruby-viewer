// Utility functions for Broadlistening visualization

/**
 * Wrap text with line breaks at specified character limit
 */
export const wrapText = (text: string, maxChars: number): string => {
  if (!text || text.length <= maxChars) {
    return text;
  }

  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.substring(0, maxChars));
    remaining = remaining.substring(maxChars);
  }

  return lines.join("<br>");
};

/**
 * Wrap text with line breaks and limit number of lines
 */
export const wrapTextWithLimit = (text: string, maxChars: number, maxLines: number = 4): string => {
  if (!text) {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }

  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.substring(0, maxChars));
    remaining = remaining.substring(maxChars);

    if (lines.length >= maxLines) {
      lines[lines.length - 1] += "...";
      break;
    }
  }

  return lines.join("<br>");
};
