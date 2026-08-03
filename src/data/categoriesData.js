// Master Categories & Sub-Categories Taxonomy for E-Commerce & B2B Marketplace

export const CATEGORIES_TAXONOMY = [
  {
    id: 'electronics',
    name: 'Electronics & Gadgets',
    iconName: 'Cpu',
    badge: 'Trending',
    gradient: 'linear-gradient(135deg, #0d8abc 0%, #6366f1 100%)',
    description: 'Laptops, smartphones, audio, smart home devices, and computer peripherals.',
    subCategories: [
      'Laptops & Computers',
      'Mobiles & Tablets',
      'Headphones & Audio',
      'Cameras & Optics',
      'Smart Home & Wearables',
      'Gaming & Consoles',
      'TV & Home Entertainment',
      'Computer Peripherals & Components',
      'Power Banks & Chargers',
      'Other Electronics'
    ]
  },
  {
    id: 'fmcg',
    name: 'FMCG, Groceries & Daily Needs',
    iconName: 'ShoppingBag',
    badge: 'Quick Delivery',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    description: 'Snacks, beverages, cooking essentials, personal care, and household items.',
    subCategories: [
      'Packaged Foods & Snacks',
      'Beverages, Tea & Coffee',
      'Cooking Essentials & Spices',
      'Dairy, Bakery & Eggs',
      'Personal Care & Grooming',
      'Household & Cleaning Supplies',
      'Baby Care & Diapers',
      'Pet Supplies & Food',
      'Other FMCG Products'
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion & Lifestyle',
    iconName: 'Shirt',
    badge: 'Popular',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    description: 'Men & women apparel, footwear, watches, bags, and fashion accessories.',
    subCategories: [
      "Men's Apparel",
      "Women's Apparel",
      'Footwear & Shoes',
      'Bags, Luggage & Backpacks',
      'Watches & Wearables',
      'Fashion Jewelry & Accessories',
      'Kids & Baby Wear',
      'Eyewear & Sunglasses',
      'Other Fashion Items'
    ]
  },
  {
    id: 'industrial',
    name: 'Industrial & Business Supplies',
    iconName: 'Wrench',
    badge: 'B2B Wholesale',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    description: 'Machinery, power tools, safety equipment, electricals, and raw materials.',
    subCategories: [
      'Machinery & Heavy Equipment',
      'Power & Hand Tools',
      'Safety Gear & PPE Equipment',
      'Electricals & Industrial Lighting',
      'Plumbing, Valves & Pumps',
      'Packaging & Shipping Supplies',
      'Test & Measurement Instruments',
      'Building & Construction Materials',
      'Fasteners & Hardware',
      'Other Industrial Supplies'
    ]
  },
  {
    id: 'home',
    name: 'Home, Kitchen & Furniture',
    iconName: 'Home',
    badge: 'Top Rated',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    description: 'Furniture, kitchen appliances, home decor, cookware, and outdoor living.',
    subCategories: [
      'Office & Home Furniture',
      'Kitchenware & Small Appliances',
      'Home Decor & Lighting',
      'Bedding, Linen & Towels',
      'Garden, Patio & Outdoor',
      'Storage & Organizers',
      'Other Home & Kitchen'
    ]
  },
  {
    id: 'health',
    name: 'Beauty, Health & Wellness',
    iconName: 'Heart',
    badge: 'Essential',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    description: 'Skincare, haircare, wellness supplements, medical equipment, and grooming.',
    subCategories: [
      'Skincare & Cosmetics',
      'Haircare & Styling',
      'Health & Wellness Supplements',
      'Medical Equipment & First Aid',
      'Fragrances & Deodorants',
      'Oral & Hygiene Care',
      'Other Healthcare Items'
    ]
  },
  {
    id: 'sports',
    name: 'Sports, Fitness & Outdoor',
    iconName: 'Activity',
    badge: 'Active Lifestyle',
    gradient: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
    description: 'Gym equipment, sports gear, fitness accessories, cycling, and outdoor games.',
    subCategories: [
      'Gym & Exercise Equipment',
      'Outdoor Sports & Games',
      'Cycling & Skating',
      'Sports Footwear & Activewear',
      'Yoga & Fitness Accessories',
      'Other Sports Gear'
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive, Spare Parts & Tools',
    iconName: 'Truck',
    badge: 'Spare Parts',
    gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    description: 'Car accessories, motorbike parts, lubricants, tires, and maintenance tools.',
    subCategories: [
      'Car Accessories & Electronics',
      'Motorbike Parts & Helmets',
      'Lubricants, Oils & Fluids',
      'Tires, Rims & Wheels',
      'Auto Care & Detailing',
      'Other Vehicle Parts'
    ]
  },
  {
    id: 'office',
    name: 'Office Supplies & Stationery',
    iconName: 'Printer',
    badge: 'Office Needs',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    description: 'Billing printers, barcode scanners, paper, desk organizers, and POS items.',
    subCategories: [
      'POS Terminals & Thermal Printers',
      'Barcode Scanners & Labelers',
      'Paper, Files & Notebooks',
      'Desk Accessories & Organizers',
      'Calculators & Office Electronics',
      'Other Office Supplies'
    ]
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Farming',
    iconName: 'Sun',
    badge: 'Agri B2B',
    gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    description: 'Seeds, fertilizers, irrigation equipment, farm tools, and livestock supplies.',
    subCategories: [
      'Seeds & Plant Protection',
      'Fertilizers & Soil Care',
      'Irrigation & Water Pumps',
      'Farm Tools & Implements',
      'Animal Feed & Care',
      'Other Agriculture Supplies'
    ]
  },
  {
    id: 'software',
    name: 'Software & Services',
    iconName: 'Code',
    badge: 'Digital Solutions',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
    description: 'Billing software, ERP systems, cloud services, and professional IT repairs.',
    subCategories: [
      'Business & Billing Software',
      'Cloud & Hosting Solutions',
      'IT Repair & Maintenance',
      'Consulting & Professional Services',
      'Other Digital Services'
    ]
  },
  {
    id: 'others',
    name: 'Others & General Supplies',
    iconName: 'Box',
    badge: 'General',
    gradient: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
    description: 'General merchandise, custom products, and miscellaneous items.',
    subCategories: [
      'General Products',
      'Uncategorized Items',
      'Custom Order Products',
      'Miscellaneous'
    ]
  }
];

// Helper functions
export const getCategoryByName = (categoryName) => {
  if (!categoryName) return CATEGORIES_TAXONOMY.find(c => c.id === 'others');
  return CATEGORIES_TAXONOMY.find(c => 
    c.name.toLowerCase() === categoryName.toLowerCase() || 
    c.id.toLowerCase() === categoryName.toLowerCase()
  ) || CATEGORIES_TAXONOMY.find(c => c.id === 'others');
};

export const getSubcategories = (categoryName) => {
  const category = getCategoryByName(categoryName);
  return category ? category.subCategories : ['General Products'];
};

export const getAllSubcategoriesMap = () => {
  const map = {};
  CATEGORIES_TAXONOMY.forEach(cat => {
    map[cat.name] = cat.subCategories;
  });
  return map;
};
