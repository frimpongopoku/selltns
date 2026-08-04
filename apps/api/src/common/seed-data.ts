import {
  Collection,
  ContentBlock,
  MediaAsset,
  Order,
  PaymentMethod,
  Product,
  Tenant,
  TeamMember,
} from './types';

const TENANT_ID = 'tenant_demo';

export const tenant: Tenant = {
  id: TENANT_ID,
  name: 'Amara & Co.',
  slug: 'amara',
  customDomain: null,
  domainVerified: false,
  themeTokens: {
    template: 'FASHION',
    primary: '#B8452F',
    secondary: '#1F1B16',
    accent: '#E8C468',
    background: '#FAF6F1',
    foreground: '#1F1B16',
    fontHeading: 'var(--font-fraunces)',
    fontBody: 'var(--font-inter)',
    radius: '0.5rem',
  },
  createdAt: '2026-01-04T09:00:00.000Z',
};

export const teamMembers: TeamMember[] = [
  {
    id: 'user_1',
    tenantId: TENANT_ID,
    name: 'Amara Boateng',
    email: 'amara@amaraandco.test',
    role: 'OWNER',
    invitedAt: '2026-01-04T09:00:00.000Z',
    acceptedAt: '2026-01-04T09:05:00.000Z',
  },
  {
    id: 'user_2',
    tenantId: TENANT_ID,
    name: 'Kojo Mensah',
    email: 'kojo@amaraandco.test',
    role: 'MANAGER',
    invitedAt: '2026-02-10T09:00:00.000Z',
    acceptedAt: '2026-02-10T14:20:00.000Z',
  },
  {
    id: 'user_3',
    tenantId: TENANT_ID,
    name: 'Efua Owusu',
    email: 'efua@amaraandco.test',
    role: 'STAFF',
    invitedAt: '2026-06-01T09:00:00.000Z',
    acceptedAt: null,
  },
];

export const gallery: MediaAsset[] = [
  {
    id: 'media_1',
    tenantId: TENANT_ID,
    url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200',
    thumbUrl:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    altText: 'Folded kente-patterned fabric',
    uploadedAt: '2026-01-05T10:00:00.000Z',
  },
  {
    id: 'media_2',
    tenantId: TENANT_ID,
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
    thumbUrl:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
    altText: 'Handwoven basket bag on a stool',
    uploadedAt: '2026-01-06T10:00:00.000Z',
  },
  {
    id: 'media_3',
    tenantId: TENANT_ID,
    url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200',
    thumbUrl:
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400',
    altText: 'Model wearing a printed wax-fabric dress',
    uploadedAt: '2026-01-07T10:00:00.000Z',
  },
  {
    id: 'media_4',
    tenantId: TENANT_ID,
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
    thumbUrl:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
    altText: 'Beaded necklace on white backdrop',
    uploadedAt: '2026-01-08T10:00:00.000Z',
  },
  {
    id: 'media_5',
    tenantId: TENANT_ID,
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200',
    thumbUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
    altText: 'Leather sandals on wooden table',
    uploadedAt: '2026-01-09T10:00:00.000Z',
  },
  {
    id: 'media_6',
    tenantId: TENANT_ID,
    url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200',
    thumbUrl:
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400',
    altText: 'Detail shot of woven textile pattern',
    uploadedAt: '2026-01-10T10:00:00.000Z',
  },
];

export const products: Product[] = [
  {
    id: 'prod_1',
    tenantId: TENANT_ID,
    title: 'Adaeze Wax-Print Wrap Dress',
    slug: 'adaeze-wrap-dress',
    description:
      'A flowing wrap dress cut from hand-selected wax-print cotton. Adjustable waist tie, lined bodice, true to size.',
    price: 420,
    sku: 'AWD-001',
    stock: 14,
    isActive: true,
    images: [gallery[2].url, gallery[0].url],
    displayOrder: 0,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'prod_2',
    tenantId: TENANT_ID,
    title: 'Nkuruma Woven Basket Bag',
    slug: 'nkuruma-basket-bag',
    description:
      'Hand-woven bolga basket with genuine leather handles. Every piece is one-of-one — pattern varies slightly.',
    price: 260,
    sku: 'NBB-002',
    stock: 22,
    isActive: true,
    images: [gallery[1].url],
    displayOrder: 1,
    createdAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'prod_3',
    tenantId: TENANT_ID,
    title: 'Ama Beaded Statement Necklace',
    slug: 'ama-beaded-necklace',
    description:
      'Layered recycled-glass beads, hand-strung on waxed cord. Adjustable length, hypoallergenic clasp.',
    price: 145,
    sku: 'ABN-003',
    stock: 30,
    isActive: true,
    images: [gallery[3].url],
    displayOrder: 2,
    createdAt: '2026-01-14T10:00:00.000Z',
  },
  {
    id: 'prod_4',
    tenantId: TENANT_ID,
    title: 'Kofi Leather Slide Sandals',
    slug: 'kofi-leather-sandals',
    description:
      'Full-grain leather slides, hand-cut and stitched. Cushioned footbed, sizes 38–45.',
    price: 190,
    sku: 'KLS-004',
    stock: 8,
    isActive: true,
    images: [gallery[4].url],
    displayOrder: 3,
    createdAt: '2026-01-16T10:00:00.000Z',
  },
  {
    id: 'prod_5',
    tenantId: TENANT_ID,
    title: 'Abena Kente-Trim Blazer',
    slug: 'abena-kente-blazer',
    description:
      'Tailored cotton-twill blazer with a hand-woven kente trim along the lapel and cuffs.',
    price: 610,
    sku: 'AKB-005',
    stock: 0,
    isActive: true,
    images: [gallery[5].url],
    displayOrder: 4,
    createdAt: '2026-01-18T10:00:00.000Z',
  },
  {
    id: 'prod_6',
    tenantId: TENANT_ID,
    title: 'Yaa Draped Midi Skirt',
    slug: 'yaa-draped-midi-skirt',
    description:
      'Soft-drape midi skirt with an elasticated waist and side pockets. Pairs with any top in the collection.',
    price: 240,
    sku: 'YDM-006',
    stock: 17,
    isActive: false,
    images: [gallery[2].url],
    displayOrder: 5,
    createdAt: '2026-01-20T10:00:00.000Z',
  },
];

export const collections: Collection[] = [
  {
    id: 'col_1',
    tenantId: TENANT_ID,
    title: 'New Arrivals',
    slug: 'new-arrivals',
    description: 'The latest pieces to land in the studio, fresh off the loom.',
    themeOverride: null,
    seoTitle: 'New Arrivals — Amara & Co.',
    seoDescription:
      'Shop the newest handmade pieces from Amara & Co., made in small batches.',
    productIds: ['prod_1', 'prod_2', 'prod_3'],
    coverImage: gallery[0].url,
  },
  {
    id: 'col_2',
    tenantId: TENANT_ID,
    title: 'Accessories',
    slug: 'accessories',
    description: 'Bags, jewelry and finishing touches for every outfit.',
    themeOverride: null,
    seoTitle: 'Accessories — Amara & Co.',
    seoDescription: 'Hand-woven bags, beaded jewelry and leather accessories.',
    productIds: ['prod_2', 'prod_3', 'prod_4'],
    coverImage: gallery[1].url,
  },
  {
    id: 'col_3',
    tenantId: TENANT_ID,
    title: 'The Minimal Edit',
    slug: 'minimal-edit',
    description:
      'A pared-back capsule — clean lines, quiet colors. Styled with our Clean theme.',
    themeOverride: {
      template: 'CLEAN',
      primary: '#111111',
      secondary: '#4A4A4A',
      accent: '#C9A227',
      background: '#FFFFFF',
      foreground: '#111111',
      fontHeading: 'var(--font-inter)',
      fontBody: 'var(--font-inter)',
      radius: '0.125rem',
    },
    seoTitle: 'The Minimal Edit — Amara & Co.',
    seoDescription: 'A pared-back capsule collection with a clean, minimal look.',
    productIds: ['prod_4', 'prod_5', 'prod_6'],
    coverImage: gallery[4].url,
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'pay_1',
    tenantId: TENANT_ID,
    type: 'MOMO',
    label: 'MTN Mobile Money',
    details: { number: '024 555 0134', name: 'Amara Boateng' },
    isEnabled: true,
    isPreferred: true,
  },
  {
    id: 'pay_2',
    tenantId: TENANT_ID,
    type: 'MOMO',
    label: 'Telecel Cash',
    details: { number: '020 111 8842', name: 'Amara Boateng' },
    isEnabled: true,
    isPreferred: false,
  },
  {
    id: 'pay_3',
    tenantId: TENANT_ID,
    type: 'BANK',
    label: 'GCB Bank',
    details: {
      accountName: 'Amara & Co Ventures',
      accountNumber: '1102345678901',
      branch: 'East Legon',
    },
    isEnabled: false,
    isPreferred: false,
  },
];

export const orders: Order[] = [
  {
    id: 'order_1',
    tenantId: TENANT_ID,
    customerName: 'Naa Adjeley',
    customerContact: '055 234 1122',
    status: 'PENDING',
    items: [
      { productId: 'prod_1', title: 'Adaeze Wax-Print Wrap Dress', quantity: 1, priceAtOrder: 420 },
      { productId: 'prod_3', title: 'Ama Beaded Statement Necklace', quantity: 2, priceAtOrder: 145 },
    ],
    total: 710,
    trackingToken: 'trk_naa8842',
    createdAt: '2026-07-20T08:12:00.000Z',
    confirmedAt: null,
    seenByAdminAt: null,
    history: [
      { status: 'PENDING', note: 'Order request submitted by customer', at: '2026-07-20T08:12:00.000Z' },
    ],
  },
  {
    id: 'order_2',
    tenantId: TENANT_ID,
    customerName: 'Kwabena Owusu',
    customerContact: '024 887 3310',
    status: 'CONFIRMED',
    items: [
      { productId: 'prod_2', title: 'Nkuruma Woven Basket Bag', quantity: 1, priceAtOrder: 260 },
    ],
    total: 260,
    trackingToken: 'trk_kwab3310',
    createdAt: '2026-07-18T14:40:00.000Z',
    confirmedAt: '2026-07-18T16:05:00.000Z',
    seenByAdminAt: '2026-07-18T16:00:00.000Z',
    history: [
      { status: 'PENDING', note: 'Order request submitted by customer', at: '2026-07-18T14:40:00.000Z' },
      { status: 'CONFIRMED', note: 'Confirmed by Amara — ready for payment', at: '2026-07-18T16:05:00.000Z' },
    ],
  },
  {
    id: 'order_3',
    tenantId: TENANT_ID,
    customerName: 'Efua Danso',
    customerContact: '050 776 2201',
    status: 'MODIFIED',
    items: [
      { productId: 'prod_4', title: 'Kofi Leather Slide Sandals', quantity: 1, priceAtOrder: 190 },
      { productId: 'prod_6', title: 'Yaa Draped Midi Skirt', quantity: 1, priceAtOrder: 240 },
    ],
    total: 430,
    trackingToken: 'trk_efua2201',
    createdAt: '2026-07-15T09:22:00.000Z',
    confirmedAt: '2026-07-15T11:00:00.000Z',
    seenByAdminAt: '2026-07-15T10:50:00.000Z',
    history: [
      { status: 'PENDING', note: 'Order request submitted by customer', at: '2026-07-15T09:22:00.000Z' },
      { status: 'CONFIRMED', note: 'Confirmed by Kojo', at: '2026-07-15T11:00:00.000Z' },
      { status: 'MODIFIED', note: 'Sandal size swapped to 41 per customer request', at: '2026-07-16T10:00:00.000Z' },
    ],
  },
  {
    id: 'order_4',
    tenantId: TENANT_ID,
    customerName: 'Yaw Boadi',
    customerContact: '027 445 9981',
    status: 'COMPLETED',
    items: [
      { productId: 'prod_1', title: 'Adaeze Wax-Print Wrap Dress', quantity: 1, priceAtOrder: 420 },
    ],
    total: 420,
    trackingToken: 'trk_yaw9981',
    createdAt: '2026-07-02T12:00:00.000Z',
    confirmedAt: '2026-07-02T13:00:00.000Z',
    seenByAdminAt: '2026-07-02T12:45:00.000Z',
    history: [
      { status: 'PENDING', note: 'Order request submitted by customer', at: '2026-07-02T12:00:00.000Z' },
      { status: 'CONFIRMED', note: 'Confirmed by Amara', at: '2026-07-02T13:00:00.000Z' },
      { status: 'COMPLETED', note: 'Payment received, order fulfilled', at: '2026-07-04T09:00:00.000Z' },
    ],
  },
  {
    id: 'order_5',
    tenantId: TENANT_ID,
    customerName: 'Abena Serwaa',
    customerContact: '059 002 7765',
    status: 'CANCELLED',
    items: [
      { productId: 'prod_5', title: 'Abena Kente-Trim Blazer', quantity: 1, priceAtOrder: 610 },
    ],
    total: 610,
    trackingToken: 'trk_aben7765',
    createdAt: '2026-06-28T15:30:00.000Z',
    confirmedAt: null,
    seenByAdminAt: '2026-06-28T15:45:00.000Z',
    history: [
      { status: 'PENDING', note: 'Order request submitted by customer', at: '2026-06-28T15:30:00.000Z' },
      { status: 'CANCELLED', note: 'Out of stock — cancelled by Amara', at: '2026-06-29T08:00:00.000Z' },
    ],
  },
];

export const storyBlocks: ContentBlock[] = [
  {
    id: 'block_1',
    type: 'TEXT',
    heading: 'Behind Amara & Co.',
    body: 'Every piece starts in a small studio, not a factory. This page is where the maker shares process, sourcing, and the people behind each order.',
  },
  {
    id: 'block_2',
    type: 'VIDEO',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    caption: 'A day in the studio',
  },
  {
    id: 'block_3',
    type: 'PHOTOS',
    heading: 'In the studio',
    imageUrls: [gallery[0].url, gallery[1].url, gallery[2].url, gallery[3].url, gallery[4].url, gallery[5].url],
  },
];
