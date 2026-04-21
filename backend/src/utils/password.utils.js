const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
  }

  if (!hasLowerCase) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
  }

  if (!hasNumber) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }

  return { valid: true };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword
};