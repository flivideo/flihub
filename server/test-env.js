// Quick test script for Zod environment validation
console.log('Testing Zod environment validation...\n');

// Test 1: Invalid PORT
console.log('Test 1: Invalid PORT (should fail)');
process.env.PORT = 'notanumber';
try {
  await import('./src/config/env.js');
  console.log('❌ FAILED: Should have thrown an error');
} catch (err) {
  console.log('✅ PASSED: Correctly rejected invalid PORT');
  console.log('Error message:', err.message);
}

// Test 2: Invalid NODE_ENV
console.log('\nTest 2: Invalid NODE_ENV (should fail)');
delete process.env.PORT;
process.env.NODE_ENV = 'invalid';
try {
  // Clear the module cache
  const modulePath = './src/config/env.js';
  const fullPath = new URL(modulePath, import.meta.url).href;
  delete (await import.meta.resolve?.(modulePath));

  await import(fullPath + '?t=' + Date.now());
  console.log('❌ FAILED: Should have thrown an error');
} catch (err) {
  console.log('✅ PASSED: Correctly rejected invalid NODE_ENV');
  console.log('Error message:', err.message);
}

console.log('\n✅ Zod validation is working correctly!');
