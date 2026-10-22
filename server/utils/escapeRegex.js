// User ke search text ko safe banata hai, taaki special characters regex na tod dein
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default escapeRegex;