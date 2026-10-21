// Async route mein error aaye to automatically error handler tak pahunchata hai
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;