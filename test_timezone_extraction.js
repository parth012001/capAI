/**
 * QUICK TEST: Timezone Abbreviation Extraction
 * Tests the new extractTimezoneFromText() feature
 */

// Simulate the timezone extraction logic
const TIMEZONE_ABBREVIATIONS = {
  'pst': 'America/Los_Angeles',
  'pdt': 'America/Los_Angeles',
  'mst': 'America/Denver',
  'mdt': 'America/Denver',
  'cst': 'America/Chicago',
  'cdt': 'America/Chicago',
  'est': 'America/New_York',
  'edt': 'America/New_York',
  'akst': 'America/Anchorage',
  'akdt': 'America/Anchorage',
  'hst': 'Pacific/Honolulu',
  'hdt': 'Pacific/Honolulu',
  'gmt': 'Europe/London',
  'bst': 'Europe/London',
  'cet': 'Europe/Paris',
  'cest': 'Europe/Paris',
  'ist': 'Asia/Kolkata',
  'jst': 'Asia/Tokyo',
  'aest': 'Australia/Sydney',
  'aedt': 'Australia/Sydney',
  'nzst': 'Pacific/Auckland',
  'nzdt': 'Pacific/Auckland'
};

function extractTimezoneFromText(text) {
  const pattern = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?\s+(PST|PDT|MST|MDT|CST|CDT|EST|EDT|AKST|AKDT|HST|HDT|GMT|BST|CET|CEST|IST|JST|AEST|AEDT|NZST|NZDT)\b/i;
  const match = text.match(pattern);

  if (match && match[1]) {
    const abbreviation = match[1].toLowerCase();
    return TIMEZONE_ABBREVIATIONS[abbreviation] || null;
  }

  return null;
}

// Test cases
const testCases = [
  { input: "Can we meet tomorrow at 2pm EST?", expected: "America/New_York" },
  { input: "Let's schedule for 3:30 PM PST", expected: "America/Los_Angeles" },
  { input: "How about 10am CST on Friday?", expected: "America/Chicago" },
  { input: "Meeting at 2pm GMT", expected: "Europe/London" },
  { input: "Can we do 4 PM EDT?", expected: "America/New_York" },
  { input: "Tomorrow at 2pm", expected: null }, // No timezone mentioned
  { input: "Let's meet at 9am", expected: null }, // No timezone mentioned
  { input: "2:00 PM JST would work", expected: "Asia/Tokyo" },
];

console.log("🧪 ================================================");
console.log("🧪  TIMEZONE EXTRACTION TEST");
console.log("🧪 ================================================\n");

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = extractTimezoneFromText(test.input);
  const success = result === test.expected;

  if (success) {
    console.log(`✅ Test ${index + 1} PASSED`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Detected: ${result || 'null'}\n`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1} FAILED`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Expected: ${test.expected || 'null'}`);
    console.log(`   Got: ${result || 'null'}\n`);
    failed++;
  }
});

console.log("📊 ================================================");
console.log(`📊  RESULTS: ${passed}/${testCases.length} tests passed`);
console.log("📊 ================================================\n");

if (failed === 0) {
  console.log("🎉 ALL TESTS PASSED! Timezone extraction working correctly! 🚀\n");
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} test(s) failed\n`);
  process.exit(1);
}
