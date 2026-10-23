const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('MONGO_URI must be set to a MongoDB connection string.');
  }

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch {
    // Do not log the URI or raw driver errors: either can contain private connection details.
    throw new Error('Could not connect to MongoDB. Check MONGO_URI and database availability.');
  }
};

module.exports = connectDB;
