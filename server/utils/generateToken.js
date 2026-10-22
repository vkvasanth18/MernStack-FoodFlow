import jwt from 'jsonwebtoken';

/**
 * Generate a signed JSON Web Token (JWT)
 * @param {string} id - The MongoDB User ObjectId
 * @returns {string} - Signed JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret_fallback_key', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

export default generateToken;
