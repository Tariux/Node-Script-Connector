// Example utility functions
function greet(name) {
  return `Hello, ${name}!`;
}

function calculateSum(arr) {
  return arr.reduce((sum, num) => sum + num, 0);
}

function getCurrentTime() {
  return new Date().toISOString();
}

module.exports = {
  greet,
  calculateSum,
  getCurrentTime
};