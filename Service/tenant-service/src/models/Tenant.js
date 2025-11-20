import mongoose from 'mongoose';

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

TenantSchema.pre('save', function(next) {
  this.meta.updatedAt = new Date();
  next();
});

export default mongoose.model('Tenant', TenantSchema, 'tenants');
