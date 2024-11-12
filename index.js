const express = require('express');
const NodeCache = require('node-cache');
const { PrismaClient, Status } = require('@prisma/client');

const app = express();
const cache = new NodeCache({ stdTTL: 60, checkperiod: 10 }); // 60 seconds TTL, checks for expired keys every 10 seconds
const prisma = new PrismaClient();

app.use(express.json());

// Route to update the record's data field to a predefined value
app.patch('/update-record', async (req, res) => {
  const id = req.body.id;

  try {
    const originalData = await prisma.record.findUnique({
      where: { id },
    });

    if (!originalData) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Cache the original data
    cache.set(`originalData_${id}`, originalData);
    console.log(`Cache set for key: originalData_${id}`); // Log to confirm cache is set

    // Update the data in the database
    await prisma.record.update({
      where: { id },
      data: { data: Status.PENDING },
    });

    res.status(200).json({ message: 'Record updated to predefined value.' });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record.' });
  }
});

// Listen for expired cache items and revert the data directly
cache.on('expired', async (key, originalData) => {
  console.log(`Cache expired for key: ${key}`, originalData);
  if (key.startsWith('originalData_')) {
    const id = parseInt(key.split('_')[1], 10);

    try {
      await prisma.record.update({
        where: { id },
        data: { data: Status.ACTIVE },
      });
      console.log(`Data reverted for ID: ${id}`);
    } catch (error) {
      console.error(`Failed to revert data for ID: ${id}`, error);
    }
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
