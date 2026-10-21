export const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (err, req, res, next) => {
  // Mongoose validation error (jaise short password)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ message });
  }
  // Duplicate key (jaise same email dobara)
  if (err.code === 11000) {
    return res.status(409).json({ message: 'This email is already registered' });
  }

  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
};