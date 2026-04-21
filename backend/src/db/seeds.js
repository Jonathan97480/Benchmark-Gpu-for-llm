const { bootstrapDatabase } = require('./bootstrap');

const seedDatabase = () => {
  bootstrapDatabase();
};

if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase
};
