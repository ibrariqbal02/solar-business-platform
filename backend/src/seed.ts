import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

// Import models
import Admin from "./models/admin.model";
import Category from "./models/category.model";
import Product from "./models/product.model";
import Service from "./models/service.model";
import VideoCategory from "./models/video-category.model";
import Video from "./models/video.model";
import ArticleCategory from "./models/article-category.model";
import Article from "./models/article.model";
import FAQ from "./models/faq.model";
import Testimonial from "./models/testimonial.model";
import Lead from "./models/lead.model";
import WebsiteSettings from "./models/website-settings.model";

import connectDatabase from "./config/db";

// Load environment variables
dotenv.config();

const NUM_RECORDS = 20;

// Helper function to generate random ObjectId
const randomObjectId = () => new mongoose.Types.ObjectId();

// Seed Admins
const seedAdmins = async () => {
  console.log("Seeding Admins...");
  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  
  const admins = [
    {
      name: "Super Admin",
      email: "superadmin@solar.com",
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
    },
    ...Array.from({ length: NUM_RECORDS - 1 }, () => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: hashedPassword,
      role: faker.helpers.arrayElement(["admin", "editor"]),
      isActive: true,
    }))
  ];

  await Admin.insertMany(admins);
  console.log(`✓ Created ${admins.length} admins`);
};

// Seed Categories
const seedCategories = async () => {
  console.log("Seeding Categories...");
  
  const categoryNames = [
    "Solar Inverters Premium",
    "Solar Panels High Efficiency",
    "Batteries Lithium Ion",
    "Charge Controllers MPPT",
    "Mounting Systems Roof",
    "Cables and Connectors Professional",
    "Monitoring Systems Smart",
    "Accessories Complete Set",
    "Complete Kits Residential",
    "Hybrid Systems Advanced",
    "Power Optimizers Premium",
    "Solar Water Pumps Agricultural",
    "Lighting Systems LED",
    "Energy Storage Solutions",
    "Grid Tie Systems Certified",
    "Off Grid Systems Independent",
    "Hybrid Inverters Modern",
    "Solar Fans DC",
    "Solar Air Conditioners Eco",
    "Solar Water Heaters Thermal"
  ];

  const categories = categoryNames.slice(0, NUM_RECORDS).map((name, index) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    description: faker.lorem.paragraph(),
    image: faker.image.url(),
    imagePublicId: faker.string.uuid(),
    isActive: true,
  }));

  await Category.insertMany(categories);
  console.log(`✓ Created ${categories.length} categories`);
};

// Seed Products
const seedProducts = async () => {
  console.log("Seeding Products...");
  const categories = await Category.find({ isActive: true }).select("_id");
  
  if (categories.length === 0) {
    console.log("No categories found, skipping products");
    return;
  }

  const productNames = [
    "5kW Hybrid Solar Inverter Pro 2024",
    "10kW On-Grid Solar Inverter Elite",
    "3kW Off-Grid Solar Inverter Basic",
    "550W Monocrystalline Solar Panel Premium",
    "450W Polycrystalline Solar Panel Standard",
    "200Ah Lithium Iron Phosphate Battery Pro",
    "150Ah Deep Cycle Gel Battery Standard",
    "40A MPPT Solar Charge Controller Advanced",
    "60A PWM Solar Charge Controller Basic",
    "Premium Roof Mounting Kit Professional",
    "Heavy Duty Ground Mounting System Industrial",
    "4mm Solar Cable Roll High Quality",
    "MC4 Solar Connector Set Premium",
    "Advanced Solar Monitoring Device Smart",
    "3kW Residential Solar Kit Complete",
    "5kW Commercial Solar Kit Professional",
    "10kW Industrial Solar Kit Enterprise",
    "3kW Hybrid Inverter System Integrated",
    "Complete Inverter Battery System All-in-One",
    "Solar Powered Water Pump Agricultural"
  ];

  const products = productNames.slice(0, NUM_RECORDS).map((name, index) => {
    const category = categories[index % categories.length]._id;
    const price = faker.number.int({ min: 10000, max: 500000 });
    
    return {
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      shortDescription: faker.lorem.sentence(),
      detailedDescription: faker.lorem.paragraphs(3),
      category,
      price,
      discountedPrice: faker.datatype.boolean() ? price * 0.9 : undefined,
      unit: faker.helpers.arrayElement(["piece", "kW", "set", "pair"]),
      images: [
        {
          url: faker.image.url(),
          publicId: faker.string.uuid(),
          altText: name,
          isPrimary: true,
        }
      ],
      specifications: [
        { label: "Power", value: `${faker.number.int({ min: 1, max: 10 })}kW` },
        { label: "Voltage", value: `${faker.number.int({ min: 12, max: 48 })}V` },
        { label: "Efficiency", value: `${faker.number.int({ min: 90, max: 98 })}%` },
      ],
      features: [
        "High efficiency",
        "Long lifespan",
        "Easy installation",
        "Weather resistant"
      ],
      applications: faker.helpers.arrayElements(["residential", "commercial", "industrial"], { min: 1, max: 3 }),
      stock: faker.number.int({ min: 0, max: 50 }),
      isAvailable: faker.datatype.boolean(),
      isFeatured: faker.datatype.boolean(),
      isActive: true,
      tags: faker.helpers.arrayElements(["solar", "renewable", "energy", "power"], { min: 2, max: 4 }),
    };
  });

  await Product.insertMany(products);
  console.log(`✓ Created ${products.length} products`);
};

// Seed Services
const seedServices = async () => {
  console.log("Seeding Services...");
  
  const serviceNames = [
    "Solar Installation Service Professional",
    "Maintenance Service Plan Premium",
    "Site Survey and Consultation Expert",
    "System Design Service Custom",
    "Battery Replacement Service Fast",
    "Inverter Repair Service Expert",
    "Panel Cleaning Service Professional",
    "System Upgrade Service Complete",
    "Emergency Support Service 24/7",
    "Consultation Service Free",
    "Permit Assistance Service Full",
    "Grid Connection Service Approved",
    "Remote Monitoring Service Real-time",
    "Performance Analysis Service Detailed",
    "Warranty Claims Service Fast",
    "Technical Training Service Certified",
    "Project Management Service Complete",
    "Quality Inspection Service Thorough",
    "Safety Audit Service Comprehensive",
    "Custom Solutions Service Tailored"
  ];

  const services = serviceNames.slice(0, NUM_RECORDS).map((name, index) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    shortDescription: faker.lorem.sentence(),
    description: faker.lorem.paragraphs(2),
    image: faker.image.url(),
    imagePublicId: faker.string.uuid(),
    areas: faker.helpers.arrayElements(["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi"], { min: 2, max: 5 }),
    features: [
      "Professional team",
      "Quality work",
      "Timely completion",
      "Affordable rates"
    ],
    cta: {
      label: "Get Quote",
      type: faker.helpers.arrayElement(["link", "whatsapp", "modal"]),
      url: faker.datatype.boolean() ? faker.internet.url() : undefined,
    },
    order: faker.number.int({ min: 0, max: 20 }),
    isActive: true,
  }));

  await Service.insertMany(services);
  console.log(`✓ Created ${services.length} services`);
};

// Seed Video Categories
const seedVideoCategories = async () => {
  console.log("Seeding Video Categories...");
  
  const videoCategoryNames = [
    "Installation Guides Professional",
    "Product Reviews Expert",
    "Maintenance Tips Advanced",
    "System Design Complete",
    "Troubleshooting Common Issues",
    "Customer Stories Success",
    "Technology Updates Latest",
    "DIY Tutorials Step by Step",
    "Webinars Educational",
    "Company Updates News",
    "Product Demos Detailed",
    "Case Studies Real World",
    "Industry News Market",
    "Expert Interviews Discussions",
    "How To Guides Practical",
    "System Comparisons Analysis",
    "Installation Tips Professional",
    "Product Unboxing Reviews",
    "Technical Reviews In Depth",
    "Success Stories Inspirational"
  ];

  const videoCategories = videoCategoryNames.slice(0, NUM_RECORDS).map((name, index) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    description: faker.lorem.paragraph(),
    isActive: true,
  }));

  await VideoCategory.insertMany(videoCategories);
  console.log(`✓ Created ${videoCategories.length} video categories`);
};

// Seed Videos
const seedVideos = async () => {
  console.log("Seeding Videos...");
  const videoCategories = await VideoCategory.find({ isActive: true }).select("_id");
  
  if (videoCategories.length === 0) {
    console.log("No video categories found, skipping videos");
    return;
  }

  const videoTitles = [
    "Complete Solar Installation Guide 2024",
    "Professional Inverter Setup Tutorial",
    "Advanced Panel Maintenance Tips Guide",
    "Expert Battery Care Guide Tutorial",
    "Solar System Design Basics Course",
    "Troubleshooting Common Solar Issues",
    "Customer Success Story Residential Project",
    "Latest Solar Technology Trends 2024",
    "DIY Solar Panel Cleaning Guide Tips",
    "Grid Connection Process Explained Step",
    "Product Demo Solar Inverter Review",
    "Case Study Commercial Installation",
    "Industry News Solar Market Update",
    "Expert Interview Solar Energy Discussion",
    "How To Guide System Installation",
    "System Comparison Inverters Review",
    "Installation Tips Mounting Systems",
    "Product Unboxing Solar Panel Demo",
    "Technical Review Battery Storage Analysis",
    "Success Story Industrial Project Case"
  ];

  const videos = videoTitles.slice(0, NUM_RECORDS).map((title, index) => {
    const category = videoCategories[index % videoCategories.length]._id;
    const videoId = faker.string.alphanumeric({ length: 11 });
    
    return {
      title,
      description: faker.lorem.paragraph(),
      youtubeVideoId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: faker.image.url(),
      category,
      publishedAt: faker.date.past(),
      duration: `${faker.number.int({ min: 2, max: 30 })}:${faker.string.numeric(2)}`,
      tags: faker.helpers.arrayElements(["solar", "installation", "tutorial", "guide"], { min: 2, max: 4 }),
      isVisible: true,
      isFeatured: faker.datatype.boolean(),
    };
  });

  await Video.insertMany(videos);
  console.log(`✓ Created ${videos.length} videos`);
};

// Seed Article Categories
const seedArticleCategories = async () => {
  console.log("Seeding Article Categories...");
  
  const articleCategoryNames = [
    "Solar Basics Introduction",
    "Installation Guides Professional",
    "Maintenance Tips Expert",
    "Product Reviews Detailed",
    "Industry News Updates",
    "Case Studies Real World",
    "Technical Articles In Depth",
    "FAQs Common Questions",
    "Policy Updates Regulatory",
    "Sustainability Environmental",
    "Energy Storage Solutions",
    "Grid Technology Smart",
    "Off Grid Living Guide",
    "Solar Financing Options",
    "System Design Complete",
    "Product Comparisons Analysis",
    "Industry Trends Market",
    "Regulatory Updates Compliance",
    "Market Analysis Reports",
    "Technology Innovations Future"
  ];

  const articleCategories = articleCategoryNames.slice(0, NUM_RECORDS).map((name, index) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    description: faker.lorem.paragraph(),
    isActive: true,
  }));

  await ArticleCategory.insertMany(articleCategories);
  console.log(`✓ Created ${articleCategories.length} article categories`);
};

// Seed Articles
const seedArticles = async () => {
  console.log("Seeding Articles...");
  const articleCategories = await ArticleCategory.find({ isActive: true }).select("_id");
  const products = await Product.find({ isActive: true }).select("_id");
  const videos = await Video.find({ isVisible: true }).select("_id");
  
  if (articleCategories.length === 0) {
    console.log("No article categories found, skipping articles");
    return;
  }

  const articleTitles = [
    "Introduction to Solar Energy Systems 2024",
    "Choosing the Right Solar Inverter Guide",
    "Complete Panel Selection Guide 2024",
    "Advanced Battery Storage Options Review",
    "Professional Installation Best Practices",
    "Solar System Maintenance Schedule Tips",
    "Solar Cost-Benefit Analysis Report",
    "Grid-Tied vs Off-Grid Systems Comparison",
    "Hybrid Solar Systems Explained Guide",
    "Solar Financing Options Complete Guide",
    "Energy Storage Solutions Guide 2024",
    "Grid Technology Overview and Trends",
    "Off Grid Living Complete Guide",
    "Solar Financing Options and Tips",
    "Professional System Design Guide",
    "Product Comparison Guide 2024",
    "Industry Trends Analysis Report",
    "Regulatory Updates Overview 2024",
    "Market Analysis Report Solar",
    "Technology Innovations Review Solar"
  ];

  const articles = articleTitles.slice(0, NUM_RECORDS).map((title, index) => {
    const category = articleCategories[index % articleCategories.length]._id;
    const relatedProducts = products.length > 0 
      ? faker.helpers.arrayElements(products.map(p => p._id), { min: 0, max: 3 })
      : [];
    const relatedVideos = videos.length > 0
      ? faker.helpers.arrayElements(videos.map(v => v._id), { min: 0, max: 2 })
      : [];
    
    return {
      title,
      slug: title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      featuredImage: faker.image.url(),
      featuredImagePublicId: faker.string.uuid(),
      excerpt: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(3),
      technicalExplanation: faker.lorem.paragraphs(2),
      troubleshootingSteps: [
        "Check power connections",
        "Verify system settings",
        "Inspect components",
        "Test voltage levels"
      ],
      safetyInformation: faker.lorem.paragraph(),
      category,
      relatedVideos,
      relatedProducts,
      tags: faker.helpers.arrayElements(["solar", "energy", "guide", "tutorial"], { min: 2, max: 4 }),
      status: faker.helpers.arrayElement(["draft", "published", "unpublished"]),
      publishedAt: faker.date.past(),
      readTimeMinutes: faker.number.int({ min: 3, max: 15 }),
    };
  });

  await Article.insertMany(articles);
  console.log(`✓ Created ${articles.length} articles`);
};

// Seed FAQs
const seedFAQs = async () => {
  console.log("Seeding FAQs...");
  
  const faqData = [
    {
      question: "What is the lifespan of solar panels?",
      answer: "Solar panels typically last 25-30 years with proper maintenance.",
      category: "products",
    },
    {
      question: "How much does a solar system cost?",
      answer: "The cost varies depending on system size and components. Contact us for a customized quote.",
      category: "pricing",
    },
    {
      question: "Do you offer installation services?",
      answer: "Yes, we provide professional installation services across Pakistan.",
      category: "installation",
    },
    {
      question: "What warranty do you offer?",
      answer: "We offer manufacturer warranties on products and installation warranty on services.",
      category: "warranty",
    },
    {
      question: "How long does installation take?",
      answer: "Typical residential installation takes 1-3 days depending on system complexity.",
      category: "installation",
    }
  ];

  const faqs = [
    ...faqData,
    ...Array.from({ length: NUM_RECORDS - faqData.length }, () => ({
      question: faker.lorem.sentence() + "?",
      answer: faker.lorem.paragraph(),
      category: faker.helpers.arrayElement(["general", "products", "installation", "delivery", "technical_support", "pricing", "warranty", "other"]),
    }))
  ];

  const faqsWithOrder = faqs.map((faq, index) => ({
    ...faq,
    order: index,
    isActive: true,
  }));

  await FAQ.insertMany(faqsWithOrder);
  console.log(`✓ Created ${faqsWithOrder.length} FAQs`);
};

// Seed Testimonials
const seedTestimonials = async () => {
  console.log("Seeding Testimonials...");
  const products = await Product.find({ isActive: true }).select("_id");
  
  const testimonials = Array.from({ length: NUM_RECORDS }, () => ({
    customerName: faker.person.fullName(),
    customerImage: faker.image.avatar(),
    customerImagePublicId: faker.string.uuid(),
    customerLocation: faker.location.city() + ", " + faker.location.country(),
    review: faker.lorem.paragraphs(2),
    rating: faker.number.int({ min: 4, max: 5 }),
    relatedProduct: products.length > 0 && faker.datatype.boolean() 
      ? products[faker.number.int({ min: 0, max: products.length - 1 })]._id 
      : undefined,
    relatedService: faker.datatype.boolean() ? faker.helpers.arrayElement(["Solar Installation", "Maintenance", "Repair"]) : undefined,
    isVisible: true,
    status: faker.helpers.arrayElement(["pending", "approved", "approved"]), // Mostly approved
  }));

  await Testimonial.insertMany(testimonials);
  console.log(`✓ Created ${testimonials.length} testimonials`);
};

// Seed Leads
const seedLeads = async () => {
  console.log("Seeding Leads...");
  const admins = await Admin.find({ isActive: true }).select("_id");
  
  const leadTypes = ["product_enquiry", "technical_support", "video_call", "site_visit", "installation", "contact"];
  const leadStatuses = ["new", "contacted", "in_progress", "scheduled", "completed", "resolved", "cancelled"];

  const leads = Array.from({ length: NUM_RECORDS }, () => {
    const type = faker.helpers.arrayElement(leadTypes);
    
    return {
      type,
      status: faker.helpers.arrayElement(leadStatuses),
      customerName: faker.person.fullName(),
      customerPhone: faker.phone.number(),
      customerWhatsApp: faker.phone.number(),
      customerEmail: faker.internet.email(),
      data: {
        message: faker.lorem.paragraph(),
        preferredDate: faker.date.future().toISOString(),
        budget: faker.helpers.arrayElement(["100k-200k", "200k-500k", "500k+"]),
        address: faker.location.streetAddress(),
      },
      adminNote: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
      assignedTo: admins.length > 0 && faker.datatype.boolean()
        ? admins[faker.number.int({ min: 0, max: admins.length - 1 })]._id
        : undefined,
    };
  });

  await Lead.insertMany(leads);
  console.log(`✓ Created ${leads.length} leads`);
};

// Seed Website Settings
const seedWebsiteSettings = async () => {
  console.log("Seeding Website Settings...");
  
  const existingSettings = await WebsiteSettings.findOne();
  if (existingSettings) {
    console.log("Website settings already exist, skipping");
    return;
  }

  const settings = {
    _singleton: "global",
    businessName: "Solar Business Platform",
    tagline: "Powering Your Future with Solar Energy",
    logo: faker.image.url(),
    logoPublicId: faker.string.uuid(),
    favicon: faker.image.url(),
    faviconPublicId: faker.string.uuid(),
    whatsappNumber: "+923001234567",
    phone: "+923001234567",
    email: "info@solarbusiness.com",
    address: "123 Solar Street, Lahore, Pakistan",
    city: "Lahore",
    country: "Pakistan",
    youtubeChannelUrl: "https://www.youtube.com/@solarbusiness",
    socialLinks: {
      facebook: "https://facebook.com/solarbusiness",
      instagram: "https://instagram.com/solarbusiness",
      youtube: "https://youtube.com/@solarbusiness",
      twitter: "https://twitter.com/solarbusiness",
      linkedin: "https://linkedin.com/company/solarbusiness",
      tiktok: "https://tiktok.com/@solarbusiness",
    },
    businessHours: {
      monday: "9AM-6PM",
      tuesday: "9AM-6PM",
      wednesday: "9AM-6PM",
      thursday: "9AM-6PM",
      friday: "9AM-6PM",
      saturday: "9AM-6PM",
      sunday: "Closed",
    },
    serviceAreas: ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi"],
    currency: "PKR",
    metaTitle: "Solar Business Platform - Quality Solar Solutions",
    metaDescription: "Premium solar products and installation services in Pakistan",
    metaKeywords: ["solar", "inverter", "panels", "battery", "installation", "Pakistan"],
    googleAnalyticsId: "",
    facebookPixelId: "",
    maintenanceMode: false,
  };

  await WebsiteSettings.create(settings);
  console.log("✓ Created website settings");
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");
    console.log(`Target: ${NUM_RECORDS} records per model\n`);

    // Connect to database
    await connectDatabase();

    // Clear existing data to avoid conflicts
    console.log("Clearing existing data...");
    await Promise.all([
      Admin.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Service.deleteMany({}),
      VideoCategory.deleteMany({}),
      Video.deleteMany({}),
      ArticleCategory.deleteMany({}),
      Article.deleteMany({}),
      FAQ.deleteMany({}),
      Testimonial.deleteMany({}),
      Lead.deleteMany({}),
      WebsiteSettings.deleteMany({}),
    ]);
    console.log("✓ Cleared existing data\n");

    // Seed in order to handle relationships
    await seedAdmins();
    await seedCategories();
    await seedProducts();
    await seedServices();
    await seedVideoCategories();
    await seedVideos();
    await seedArticleCategories();
    await seedArticles();
    await seedFAQs();
    await seedTestimonials();
    await seedLeads();
    await seedWebsiteSettings();

    console.log("\n✅ Database seeding completed successfully!");
    console.log(`\n📊 Summary: ${NUM_RECORDS} records added to each model`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

// Run seed
seedDatabase();