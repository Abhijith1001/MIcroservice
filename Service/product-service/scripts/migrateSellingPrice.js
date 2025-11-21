import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTenantConnection } from '../../shared/src/connectionManager.js';
import { ProductSchema } from '../src/models/Product.js';

const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
};

const __filename = fileURLToPath(import.meta.url);

function maskUri(uri = '') {
  if (!uri.includes('://')) return uri;
  const [protocol, rest] = uri.split('://');
  if (!rest.includes('@')) return uri;
  const maskedRest = rest.replace(/^[^@]+@/, '***:***@');
  return `${protocol}://${maskedRest}`;
}

async function getAllTenants() {
  try {
    // Connect to tenant service database
    const tenantDbUri = process.env.TENANT_DB_URI || process.env.MONGO_BASE_URI || 'mongodb+srv://abhijiithb_db_user:SdyNpzWgsqjVnWYK@saasample.9wzsdy0.mongodb.net/tenant_registry';
    logger.info(`Connecting to tenant registry: ${maskUri(tenantDbUri)}`);
    const tenantConn = await mongoose.createConnection(tenantDbUri).asPromise();
    logger.info('Tenant registry connection established');
    
    // Import existing Tenant schema
    const TenantSchema = new mongoose.Schema({
      tenantId: { 
        type: String, 
        unique: true, 
        index: true,
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      subdomain: { 
        type: String, 
        unique: true, 
        sparse: true,
        lowercase: true,
        match: [/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens']
      },
      customDomain: { 
        type: String, 
        unique: true, 
        sparse: true,
        lowercase: true
      },
      dbName: {
        type: String,
        required: true
      },
      dbUri: {
        type: String,
        required: true
      },
      status: { 
        type: String, 
        default: 'ACTIVE',
        enum: ['ACTIVE', 'SUSPENDED', 'PENDING']
      },
      meta: {
        createdAt: { 
          type: Date, 
          default: Date.now 
        },
        updatedAt: { 
          type: Date, 
          default: Date.now 
        }
      }
    });
    
    const Tenant = tenantConn.model('Tenant', TenantSchema, 'tenants');
    const tenants = await Tenant.find({ status: 'ACTIVE' }).lean();
    logger.info(`Fetched ${tenants.length} active tenants`);
    
    await tenantConn.close();
    logger.info('Tenant registry connection closed');
    return tenants;
  } catch (error) {
    logger.error('Failed to fetch tenants:', error);
    return [];
  }
}

async function migrateSellingPrice() {
  try {
    logger.info('----- Starting sellingPrice migration run -----');
    logger.info(`Environment TENANT_DB_URI=${maskUri(process.env.TENANT_DB_URI) || 'not set'}, MONGO_BASE_URI=${maskUri(process.env.MONGO_BASE_URI) || 'not set'}`);
    // Get all active tenants
    const tenants = await getAllTenants();
    logger.info(`Found ${tenants.length} active tenants`);
    
    if (tenants.length === 0) {
      logger.warn('No active tenants found');
      return;
    }
    
    let totalUpdated = 0;

    for (const tenant of tenants) {
      logger.info(`Processing tenant: ${tenant.tenantId} (${tenant.name})`);
      
      try {
        // Get tenant-specific connection
        logger.info(`Connecting to tenant DB: ${maskUri(tenant.dbUri)}`);
        const db = await getTenantConnection(tenant.dbUri);
        logger.info('Tenant DB connection ready');
        const ProductModel = db.model('Product', ProductSchema);
        
        // Find products without sellingPrice
        const products = await ProductModel.find({ 
          sellingPrice: { $exists: false } 
        }).lean();
        
        logger.info(`Tenant ${tenant.tenantId}: found ${products.length} products missing sellingPrice`);
        
        if (products.length === 0) {
          logger.info(`No products need migration for tenant ${tenant.tenantId} - all already have sellingPrice`);
          continue;
        }
        
        // Update in batches to avoid memory issues
        const batchSize = 100;
        let tenantUpdated = 0;
        
        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize);
          const updates = batch.map(product => ({
            updateOne: {
              filter: { _id: product._id },
              update: { $set: { sellingPrice: product.price } }
            }
          }));
          
          const result = await ProductModel.bulkWrite(updates);
          tenantUpdated += result.modifiedCount;
          
          logger.info(`Tenant ${tenant.tenantId}: updated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)} (${result.modifiedCount} products)`);
        }
        
        totalUpdated += tenantUpdated;
        logger.info(`Completed migration for tenant ${tenant.tenantId}: ${tenantUpdated} products updated`);
        
      } catch (tenantError) {
        logger.error(`Failed to migrate tenant ${tenant.tenantId}:`, tenantError);
        // Continue with next tenant
      }
    }
    
    logger.info(`Migration completed. Total products updated across all tenants: ${totalUpdated}`);
    logger.info('----- sellingPrice migration run finished -----');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if called directly
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedFile && __filename === invokedFile) {
  await migrateSellingPrice();
}

export default migrateSellingPrice;
