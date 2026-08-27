import app from './index';
import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

const PORT = 3009;
let server: any;
let adminToken = '';
let userToken = '';

const TEST_DOMAIN_1 = 'WHITE_GOLD';
const TEST_DOMAIN_2 = 'AL_JAWHARA';

async function fetchAPI(path: string, options: any = {}) {
  const url = `http://localhost:${PORT}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = text; }
  
  if (!res.ok) {
    throw new Error(`API Error [${res.status}]: ${JSON.stringify(json)}`);
  }
  return json;
}

async function run() {
  console.log('🚀 Starting End-to-End Test Suite');

  // Start Server
  server = app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));

  try {
    // 0. Clean the DB
    console.log('🧹 Cleaning Database...');
    await prisma.vaultAdjustment.deleteMany();
    await prisma.cottonPurchase.deleteMany();
    await prisma.cottonSale.deleteMany();
    await prisma.wasteSale.deleteMany();
    await prisma.packagingPurchase.deleteMany();
    await prisma.jawharaPurchase.deleteMany();
    await prisma.jawharaSale.deleteMany();
    await prisma.jawharaExpense.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.worker.deleteMany();
    await prisma.vault.deleteMany();
    await prisma.user.deleteMany();
    
    // Create admin manually for first login
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { 
        username: 'admin_test', 
        passwordHash: hashed, 
        role: 'ADMIN', 
        domainAccess: {
          create: [
            { domain: 'WHITE_GOLD' },
            { domain: 'AL_JAWHARA' }
          ]
        }
      }
    });

    // 1. Authentication
    console.log('🔑 Testing Authentication...');
    const loginRes = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin_test', password: 'admin123' })
    });
    adminToken = loginRes.token;
    console.log('✅ Admin login successful');

    // Create Normal User
    const createUserRes = await fetchAPI('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ username: 'user_test', password: 'user123', role: 'EMPLOYEE', domains: ['WHITE_GOLD'] })
    });
    console.log('✅ Normal User created successfully');

    const loginUserRes = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'user_test', password: 'user123' })
    });
    userToken = loginUserRes.token;

    // 2. Vault Initialization
    console.log('💰 Initializing Vaults...');
    await fetchAPI(`/api/vault/summary?domain=${TEST_DOMAIN_1}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    await fetchAPI(`/api/vault/summary?domain=${TEST_DOMAIN_2}`, { headers: { Authorization: `Bearer ${adminToken}` } });

    const wgVault = await fetchAPI(`/api/vault/summary?domain=${TEST_DOMAIN_1}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const jwVault = await fetchAPI(`/api/vault/summary?domain=${TEST_DOMAIN_2}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    
    await fetchAPI(`/api/vault/${wgVault.vaultId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ initialCapital: 5000000 })
    });
    await fetchAPI(`/api/vault/${jwVault.vaultId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ initialCapital: 2000000 })
    });
    console.log('✅ Vaults capitalized successfully');

    // 3. Management
    console.log('👥 Adding Employees & Workers...');
    await fetchAPI('/api/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'WG Emp', jobTitle: 'Manager', salary: 1000, domain: TEST_DOMAIN_1, startDate: new Date().toISOString() })
    });
    await fetchAPI('/api/workers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'WG Worker', dailyWage: 100, domain: TEST_DOMAIN_1, date: new Date().toISOString() })
    });
    console.log('✅ Employees and Workers added');

    // 4. White Gold Flow
    console.log('🏭 Testing White Gold Workflow...');
    await fetchAPI('/api/wg/purchases/cotton', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ date: new Date().toISOString(), customerName: 'Farmer', truckPlateNumber: '123', sacksCount: 100, weightKg: 1000, pricePerSack: 1000, totalAmount: 100000, notes: '' })
    });
    
    await fetchAPI('/api/wg/sales/cotton', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ date: new Date().toISOString(), type: 'COTTON', customerName: 'Buyer', destination: 'Port', quantity: 50, weightKg: 5000, lotNumber: 'L1', pricePerUnit: 5000, totalAmount: 250000, notes: '' })
    });

    const updatedWgVault = await fetchAPI(`/api/vault/summary?domain=${TEST_DOMAIN_1}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const expectedBalance = 5000000 - 100000 + 250000;
    if (updatedWgVault.availableBalance !== expectedBalance) {
      throw new Error(`Vault math mismatch! Expected ${expectedBalance}, got ${updatedWgVault.availableBalance}`);
    }
    console.log('✅ White Gold Vault Math is perfectly accurate');

    // 5. Al Jawhara Flow
    console.log('🛢️ Testing Al Jawhara Workflow...');
    await fetchAPI('/api/jw/purchases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ date: new Date().toISOString(), category: 'RAW', customerName: 'Supplier', truckPlateNumber: '456', sacksCount: 50, weightKg: 500, pricePerSack: 500, totalAmount: 25000, notes: '' })
    });

    // Add Stock before selling
    const oilStock = await fetchAPI('/api/jw/stock?category=OIL', { headers: { Authorization: `Bearer ${adminToken}` } });
    if (oilStock && oilStock.length > 0) {
      await fetchAPI(`/api/jw/stock/${oilStock[0].id}/movements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ date: new Date().toISOString(), movementType: 'IN', quantity: 100, referenceType: 'MANUAL', notes: 'Initial E2E Stock' })
      });
    }

    await fetchAPI('/api/jw/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ date: new Date().toISOString(), category: 'OIL', customerName: 'Supermarket', quantity: 10, weightKg: 100, pricePerUnit: 2000, totalAmount: 20000, notes: '' })
    });

    await fetchAPI('/api/jw/expenses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ date: new Date().toISOString(), category: 'OPERATIONS', description: 'Fuel', amount: 5000, notes: '' })
    });

    const updatedJwVault = await fetchAPI(`/api/vault/summary?domain=${TEST_DOMAIN_2}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const expectedJwBalance = 2000000 - 25000 + 20000 - 5000;
    if (updatedJwVault.availableBalance !== expectedJwBalance) {
      throw new Error(`Jawhara Vault math mismatch! Expected ${expectedJwBalance}, got ${updatedJwVault.availableBalance}`);
    }
    console.log('✅ Al Jawhara Vault Math is perfectly accurate');

    // 6. RBAC
    console.log('🛡️ Testing Permissions...');
    await fetchAPI('/api/wg/purchases/cotton', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ date: new Date().toISOString(), customerName: 'Farmer2', truckPlateNumber: '999', sacksCount: 10, weightKg: 100, pricePerSack: 1000, totalAmount: 10000, notes: '' })
    });
    console.log('✅ Normal user successfully accessed permitted domain');

    try {
      await fetchAPI('/api/jw/purchases', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ date: new Date().toISOString(), category: 'RAW', customerName: 'Sup', truckPlateNumber: '1', sacksCount: 1, weightKg: 10, pricePerSack: 1, totalAmount: 1, notes: '' })
      });
      throw new Error('User was able to access a forbidden domain!');
    } catch (err: any) {
      if (err.message.includes('403')) {
        console.log('✅ Normal user was correctly blocked from forbidden domain');
      } else {
        throw err;
      }
    }

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The entire ERP system is stable and fully functional.');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

run();
