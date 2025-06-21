/**
 * Content filtering module for QR Letters
 * This module contains functions to detect and filter inappropriate content
 */

/**
 * Enhanced content filter function
 * Detects inappropriate content using multiple filtering techniques
 * 
 * @param {string} message - The message to filter
 * @returns {Object} - Filter result with isExplicit boolean, confidence score, and reason
 */
export function contentFilter(message) {
  if (!message || typeof message !== 'string') {
    return {
      isExplicit: false,
      confidence: 0,
      reason: 'No content to filter'
    };
  }

  const messageText = message.toLowerCase().trim();
  
  // Enhanced inappropriate keywords list
  const explicitKeywords = [
    // Profanity and offensive language
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
    // Hate speech indicators
    'hate', 'kill', 'die', 'murder', 'terrorist',
    // Spam and scam indicators
    'spam', 'scam', 'phishing', 'click here', 'free money', 'urgent',
    'congratulations you won', 'claim your prize', 'limited time offer',
    // Adult content indicators
    'porn', 'sex', 'nude', 'naked', 'adult content',
    // Harassment indicators
    'loser', 'stupid', 'idiot', 'moron', 'retard',
    // Drug-related content
    'drugs', 'cocaine', 'heroin', 'marijuana', 'weed',
    // Violence indicators
    'violence', 'fight', 'attack', 'assault', 'weapon'
  ];
  
  // Check for explicit keywords
  const foundKeywords = explicitKeywords.filter(keyword => 
    messageText.includes(keyword.toLowerCase())
  );
  
  // Advanced heuristics for suspicious content
  const hasExcessiveCapitals = (message.match(/[A-Z]/g) || []).length > message.length * 0.6;
  const hasExcessivePunctuation = (message.match(/[!@#$%^&*()]{3,}/g) || []).length > 0;
  const hasRepeatedChars = /(.)\1{4,}/.test(message); // 5+ repeated characters
  const hasExcessiveEmojis = (message.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length > message.length * 0.3;
  
  // URL/Link detection (potential phishing)
  const hasUrls = /https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(messageText);
  
  // Phone number patterns (potential spam)
  const hasPhoneNumbers = /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/.test(message);
  
  // Email patterns (potential spam)
  const hasEmails = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(messageText);
  
  // Excessive special characters
  const specialCharCount = (message.match(/[^a-zA-Z0-9\s]/g) || []).length;
  const hasExcessiveSpecialChars = specialCharCount > message.length * 0.4;
  
  // All caps message (likely spam/shouting)
  const isAllCaps = message.length > 10 && message === message.toUpperCase() && /[A-Z]/.test(message);
  
  // Determine if content is explicit
  let isExplicit = false;
  let confidence = 0.1;
  let reasons = [];
  
  if (foundKeywords.length > 0) {
    isExplicit = true;
    confidence = Math.min(0.9, 0.3 + (foundKeywords.length * 0.2));
    reasons.push(`Contains inappropriate keywords: ${foundKeywords.slice(0, 3).join(', ')}`);
  }
  
  if (hasExcessiveCapitals) {
    isExplicit = true;
    confidence = Math.max(confidence, 0.6);
    reasons.push('Excessive capital letters detected');
  }
  
  if (hasExcessivePunctuation) {
    isExplicit = true;
    confidence = Math.max(confidence, 0.7);
    reasons.push('Excessive punctuation detected');
  }
  
  if (hasRepeatedChars) {
    isExplicit = true;
    confidence = Math.max(confidence, 0.5);
    reasons.push('Suspicious repeated characters');
  }
  
  if (hasUrls && foundKeywords.length > 0) {
    isExplicit = true;
    confidence = Math.max(confidence, 0.8);
    reasons.push('Suspicious links detected');
  }
  
  if (hasExcessiveSpecialChars) {
    isExplicit = true;
    confidence = Math.max(confidence, 0.6);
    reasons.push('Excessive special characters');
  }
  
  if (isAllCaps) {
    isExplicit = true;
    confidence = Math.max(confidence, 0.5);
    reasons.push('All caps message detected');
  }
  
  // Additional spam indicators
  if ((hasPhoneNumbers || hasEmails) && (hasUrls || foundKeywords.length > 0)) {
    isExplicit = true;
    confidence = Math.max(confidence, 0.7);
    reasons.push('Potential spam content detected');
  }
  
  return {
    isExplicit,
    confidence: Math.round(confidence * 100) / 100,
    reason: reasons.length > 0 ? reasons[0] : 'Content appears clean',
    allReasons: reasons,
    detectedKeywords: foundKeywords
  };
}

/**
 * Advanced content filter (placeholder for future implementation)
 * This would integrate with external AI services for more sophisticated filtering
 * 
 * @param {string} message - The message to filter
 * @returns {Promise<Object>} - Promise resolving to filter result
 */
export async function advancedContentFilter(message) {
  // Placeholder for integration with external AI moderation services
  // Example integrations:
  // - OpenAI Moderation API
  // - Google Cloud Natural Language API
  // - Azure Content Moderator
  // - AWS Comprehend
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(contentFilter(message));
    }, 100);
  });
}

/**
 * Whitelist checker - allows certain content that might be flagged
 * @param {string} message - The message to check
 * @returns {boolean} - True if message should be allowed despite flags
 */
export function isWhitelisted(message) {
  const whitelistPatterns = [
    // Educational or informational content
    /educational|information|learn|study/i,
    // Business or professional content
    /business|professional|company|organization/i,
    // Emergency or important notifications
    /emergency|urgent|important|notice/i
  ];
  
  return whitelistPatterns.some(pattern => pattern.test(message));
}