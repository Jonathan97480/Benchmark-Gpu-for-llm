const bcrypt = require('bcrypt');

const testPassword = async () => {
  const password = 'Test1234';
  const hash = '$2b$12$A8elmKw35SNoetDVO4p7yO9jlhHkrvETc6X9ndY9pnMb4YR/PCpjy';

  try {
    const result = await bcrypt.compare(password, hash);
    console.log('Password comparison result:', result);
  } catch (error) {
    console.error('Error comparing password:', error);
  }

  try {
    const newHash = await bcrypt.hash(password, 12);
    console.log('New hash:', newHash);

    const compareResult = await bcrypt.compare(password, newHash);
    console.log('New hash comparison:', compareResult);
  } catch (error) {
    console.error('Error hashing password:', error);
  }
};

testPassword();