require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

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


function buildVendorUpdateData(vendor, decrementAmount) {
  const updateData = { currentOutStanding: { decrement: decrementAmount } };
  if (Object.prototype.hasOwnProperty.call(vendor, 'status')) {
    const newOutstanding = (vendor.currentOutStanding || 0) - decrementAmount;
    if (newOutstanding <= 0) updateData.status = 'Written Off';
  }
  return updateData;
}


app.post('/writeoffs', async (req, res) => {
  try {
    const { vendorId, fmNumber, date, amount, note, adminId, branchId } = req.body;
    if (!vendorId || !fmNumber || typeof amount === 'undefined') {
      return res.status(400).json({ error: 'vendorId, fmNumber and amount are required' });
    }

    const vendor = await prisma.vendors.findUnique({ where: { id: vendorId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    if (!vendor.currentOutStanding || vendor.currentOutStanding <= 0) {
      return res.status(400).json({ error: 'No pending amount to write-off' });
    }

    const requested = Number(amount);
    if (isNaN(requested) || requested <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const safeAmount = Math.min(requested, vendor.currentOutStanding);
    if (safeAmount <= 0) {
      return res.status(400).json({ error: 'No pending amount to write-off' });
    }

    const writeOffData = {
      fmNumber,
      date: date ? new Date(date) : new Date(),
      note,
      amount: safeAmount,
      vendorId,
      adminId,
      branchId,
    };

    const vendorUpdateData = buildVendorUpdateData(vendor, safeAmount);

    let writeOff, updatedVendor;

    
    try {
      const [w, v] = await prisma.$transaction([
        prisma.writeOff.create({ data: writeOffData }),
        prisma.vendors.update({ where: { id: vendorId }, data: vendorUpdateData }),
      ]);
      writeOff = w;
      updatedVendor = v;
    } catch (txErr) {
      writeOff = await prisma.writeOff.create({ data: writeOffData });
      updatedVendor = await prisma.vendors.update({ where: { id: vendorId }, data: vendorUpdateData });
    }

    return res.json({ writeOff, updatedVendor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});


app.post('/writeoffs/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }

    const results = [];

    for (const it of items) {
      const { vendorId, fmNumber, amount, note, adminId, branchId } = it;
      if (!vendorId || !fmNumber || typeof amount === 'undefined') {
        results.push({ vendorId, ok: false, error: 'vendorId, fmNumber and amount required' });
        continue;
      }

      const vendor = await prisma.vendors.findUnique({ where: { id: vendorId } });
      if (!vendor) {
        results.push({ vendorId, ok: false, error: 'vendor not found' });
        continue;
      }

      if (!vendor.currentOutStanding || vendor.currentOutStanding <= 0) {
        results.push({ vendorId, ok: false, error: 'no pending amount' });
        continue;
      }

      const requested = Number(amount);
      if (isNaN(requested) || requested <= 0) {
        results.push({ vendorId, ok: false, error: 'invalid amount' });
        continue;
      }

      const safeAmount = Math.min(requested, vendor.currentOutStanding);
      if (safeAmount <= 0) {
        results.push({ vendorId, ok: false, error: 'safeAmount zero' });
        continue;
      }

      const writeOffData = {
        fmNumber,
        date: new Date(),
        note,
        amount: safeAmount,
        vendorId,
        adminId,
        branchId,
      };

      try {
        
        const writeOff = await prisma.writeOff.create({ data: writeOffData });
        const vendorUpdateData = buildVendorUpdateData(vendor, safeAmount);
        const updatedVendor = await prisma.vendors.update({ where: { id: vendorId }, data: vendorUpdateData });

        results.push({ vendorId, ok: true, writeOff, updatedVendor });
      } catch (innerErr) {
        console.error('Error processing item', it, innerErr);
        results.push({ vendorId, ok: false, error: innerErr.message || 'failed' });
      }
    }

    return res.json({ results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});


app.get('/vendors', async (req, res) => {
  try {
    const vendors = await prisma.vendors.findMany();
    res.json(vendors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/vendors/:id', async (req, res) => {
  try {
    const v = await prisma.vendors.findUnique({ where: { id: req.params.id } });
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    res.json(v);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/vendors/:id/writeoffs', async (req, res) => {
  try {
    const vendorId = req.params.id;
    const list = await prisma.writeOff.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/writeoffs', async (req, res) => {
  try {
    const list = await prisma.writeOff.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.post('/vendors', async (req, res) => {
  try {
    const { name, currentOutStanding } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const v = await prisma.vendors.create({ data: { name, currentOutStanding: Number(currentOutStanding) || 0 } });
    res.json(v);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/admins', async (req, res) => {
  try {
    const { userName, password, branch } = req.body;
    if (!userName || !password) return res.status(400).json({ error: 'userName and password required' });
    const a = await prisma.admin.create({ data: { userName, password, branch: branch || '' } });
    res.json(a);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/branches', async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const b = await prisma.branches.create({ data: { name, location: location || '' } });
    res.json(b);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
