import 'dotenv/config';
import mongoose from 'mongoose';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await mongoose.connection.collection('payments').dropIndex('appointment_1');
    console.log('Old payments index dropped');
  } catch (e) {
    console.log('Nothing to drop:', e.message);
  }
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});