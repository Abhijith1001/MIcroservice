export const validateProduct = (product) => {
  const errors = [];
  
  if (!product.title || product.title.trim() === '') {
    errors.push('Product title is required');
  }
  
  if (product.price === undefined || product.price < 0) {
    errors.push('Valid price is required');
  }
  
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatProductResponse = (product) => {
  if (!product) return null;
  
  return {
    id: product._id,
    title: product.title,
    description: product.description,
    price: product.price,
    images: product.images || [],
    tags: product.tags || [],
    options: product.options || [],
    variants: product.variants || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
};
