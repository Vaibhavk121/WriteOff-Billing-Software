// src/index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Add error handling for Prisma connection
let prisma;
try {
  prisma = new PrismaClient();
  console.log('Connected to database successfully');
} catch (error) {
  console.error('Failed to connect to database:', error);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/writeoffs', async (req, res) => {
  try {
    const { vendorId, fmNumber, date, amount, note, adminId, branchId } = req.body;
    if (!vendorId || !fmNumber || typeof amount === 'undefined') {
      return res.status(400).json({ error: 'vendorId, fmNumber and amount are required' });
    }


    const vendor = await prisma.vendors.findUnique({ where: { id: vendorId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // decide on policy: ensure write-off doesn't make outstanding negative
    const safeAmount = Math.min(amt, vendor.currentOutStanding);

    const writeOff = await prisma.writeOff.create({
      data: {
        fmNumber,
        date: date ? new Date(date) : new Date(),
        note,
        amount: safeAmount,
        vendorId,
        adminId,
        branchId,
      },
    });

    const updatedVendor = await prisma.vendors.update({
      where: { id: vendorId },
      data: { currentOutStanding: { decrement: safeAmount } },
    });

    res.json({ writeOff, updatedVendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List write-offs for a vendor
app.get('/vendors/:id/writeoffs', async (req, res) => {
  const vendorId = req.params.id;
  const list = await prisma.writeOff.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

// List all vendors (quick check)
app.get('/vendors', async (req, res) => {
  const vendors = await prisma.vendors.findMany();
  res.json(vendors);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
