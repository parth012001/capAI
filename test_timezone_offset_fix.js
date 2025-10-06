/**
 * TEST: Timezone Offset Calculation Fix
 * Verifies that getTimezoneOffset() returns correct values
 */

function getTimezoneOffset(timezone) {
  try {
    // Use a reference date to get the offset
    const testDate = new Date('2025-01-15T12:00:00Z'); // 12:00 UTC

    // Format the date in the target timezone
    const tzString = testDate.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Format the same date in UTC
    const utcString = testDate.toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    console.log(`   TZ String: ${tzString}`);
    console.log(`   UTC String: ${utcString}`);

    // Parse both strings to get timestamps
    const tzDate = new Date(tzString);
    const utcDate = new Date(utcString);

    console.log(`   TZ Date: ${tzDate.toISOString()}`);
    console.log(`   UTC Date: ${utcDate.toISOString()}`);

    // Calculate offset in minutes: UTC - LocalTime
    const offsetMinutes = (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);

    console.log(`   Offset Minutes: ${offsetMinutes}`);

    // Convert to hours and minutes
    const sign = offsetMinutes >= 0 ? '-' : '+';
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;

    const offsetString = `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return offsetString;

  } catch (error) {
    console.error(`   Error: ${error.message}`);
    return null;
  }
}

// Test date conversion with offset
function testDateConversion(timeStr, timezone) {
  const baseDate = new Date('2025-10-08'); // Wednesday
  const [time, period] = timeStr.split(/\s+/);
  let hours = parseInt(time);

  if (period && period.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period && period.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }

  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  const hourStr = String(hours).padStart(2, '0');

  const dateString = `${year}-${month}-${day}T${hourStr}:00:00`;
  const offset = getTimezoneOffset(timezone);

  console.log(`   Date String: ${dateString}`);
  console.log(`   Offset: ${offset}`);
  console.log(`   Full String: ${dateString}${offset}`);

  try {
    const result = new Date(dateString + offset);
    console.log(`   Result: ${result.toISOString()}`);
    return result;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

console.log("🧪 ===================================================");
console.log("🧪  TIMEZONE OFFSET CALCULATION TEST");
console.log("🧪 ===================================================\n");

// Test 1: EST offset
console.log("📍 TEST 1: America/New_York (EST) Offset");
const estOffset = getTimezoneOffset('America/New_York');
console.log(`   Result: ${estOffset}`);
console.log(`   Expected: -05:00`);
if (estOffset === '-05:00') {
  console.log(`   ✅ PASS\n`);
} else {
  console.log(`   ❌ FAIL\n`);
}

// Test 2: PST offset
console.log("📍 TEST 2: America/Los_Angeles (PST) Offset");
const pstOffset = getTimezoneOffset('America/Los_Angeles');
console.log(`   Result: ${pstOffset}`);
console.log(`   Expected: -08:00`);
if (pstOffset === '-08:00') {
  console.log(`   ✅ PASS\n`);
} else {
  console.log(`   ❌ FAIL\n`);
}

// Test 3: Full date conversion (9 AM EST)
console.log("📍 TEST 3: Convert '9 AM' in EST to UTC");
const result = testDateConversion('9 AM', 'America/New_York');
if (result) {
  const hour = result.getUTCHours();
  console.log(`   UTC Hour: ${hour}`);
  console.log(`   Expected: 14 (9 AM EST = 2 PM UTC)`);
  if (hour === 14) {
    console.log(`   ✅ PASS\n`);
  } else {
    console.log(`   ❌ FAIL\n`);
  }
} else {
  console.log(`   ❌ FAIL - Could not convert\n`);
}

console.log("===================================================");
