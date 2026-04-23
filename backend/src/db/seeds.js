const { bootstrapDatabase } = require('./bootstrap');

const seedDatabase = () => {
  const reset = process.argv.includes('--reset') || process.env.DB_RESET === '1';
  bootstrapDatabase({ reset });
};

if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase
};
