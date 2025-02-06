import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import pdfParse from 'pdf-parse';

// Import models
import Address from './models/Address';
import Auditlog from './models/Auditlog';
import Category from './models/Category';
import Engagement from './models/Engagement';
import ManagerAuth from './models/ManagerAuth';
import PaymentDetails from './models/PaymentDetails';
import Report from './models/reports'; // Updated to use the new Report model
import UserAuth from './models/UserAuth';
import CustomerQueries from './models/CustomerQueries';
import PotentialCustomers from './models/PotentialCustomers';
import UserReport from './models/UserReports';
import Blog from './models/Blog';
import Leaves from './models/Leaves';

// Import routes
import authRoutes from './routes/auth.routes';
import managerAuthRoutes from './routes/manager.auth.routes';
import queryRoutes from './routes/query.routes';
import managerRoutes from './routes/manager.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();
const PORT = process.env.PORT || 5500;

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost and PayPal Sandbox
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.sandbox.paypal.com',
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')); // Block the request
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/manager', managerAuthRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api', paymentRoutes);

// MongoDB connection
mongoose
  .connect('mongodb://localhost:8848/GlobeLensResearch')
  .then(async () => {
    console.log('Connected to MongoDB');
    if (mongoose.connection.db) {
      await ensureCollections();
    } else {
      console.error('Database connection is not properly initialized.');
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Ensure collections exist
async function ensureCollections() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not available.');
  }

  const collections = await db.listCollections().toArray();
  const existingCollections = collections.map((col) => col.name);

  const models = [
    { model: Address, name: 'addresses' },
    { model: Auditlog, name: 'auditlogs' },
    { model: Category, name: 'categories' },
    { model: Engagement, name: 'engagements' },
    { model: ManagerAuth, name: 'managerauths' },
    { model: PaymentDetails, name: 'paymentdetails' },
    { model: Report, name: 'reports' },
    { model: CustomerQueries, name: 'queries' },
    { model: UserAuth, name: 'userauths' },
    { model: PotentialCustomers, name: 'potentialcustomers' },
    { model: Blog, name: 'blog' },
    { model: Leaves, name: 'leaves' },
  ];

  for (const { model, name } of models) {
    if (!existingCollections.includes(name)) {
      try {
        await model.createCollection();
        console.log(`Created collection: ${name}`);
      } catch (err) {
        console.error(`Error creating collection ${name}:`, err);
      }
    } else {
      console.log(`Collection already exists: ${name}`);
    }
  }
}

// Function to split text into meaningful sections
function splitIntoSections(text: string) {
  const sections = [
    { title: "Introduction", content: "" },
    { title: "Market Overview", content: "" },
    { title: "Market Analysis", content: "" },
    { title: "Key Findings", content: "" }
  ];

  let currentText = text;
  let processedSections = [];

  for (let i = 0; i < sections.length; i++) {
    let sectionText = currentText.slice(0, 2500).trim();
    let lastPeriod = sectionText.lastIndexOf('.');
    if (lastPeriod !== -1) {
      sectionText = sectionText.slice(0, lastPeriod + 1);
    }

    processedSections.push({
      title: sections[i].title,
      content: sectionText
    });

    currentText = currentText.slice(sectionText.length).trim();
    if (!currentText) break;
  }

  return processedSections;
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is connected!' });
});

// Reports endpoints
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find();
    if (!reports || reports.length === 0) {
      return res.status(404).json({ error: 'No reports found' });
    }
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const report = await Report.findOne({ _id: reportId }, { file: 0, thumbnail: 0, samplePdf: 0 });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report' });
  }
});

// Get all team members
app.get('/api/manager/team', async (req, res) => {
  try {
    const team = await ManagerAuth.find({}, '-password'); // Exclude password field
    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team members',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update team member role
app.patch('/api/manager/team/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['manager', 'employee'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team member ID'
      });
    }

    const updatedMember = await ManagerAuth.findByIdAndUpdate(
      id,
      { role },
      { new: true, select: '-password' }
    );

    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: updatedMember
    });
  } catch (error) {
    console.error('Error updating team member role:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating role',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/reports/:id/thumbnail', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const report = await Report.findOne({ _id: reportId });

    if (!report || !report.thumbnail) {
      return res.status(404).json({ message: 'Thumbnail not found' });
    }

    res.set('Content-Type', report.thumbnailType || 'image/jpeg');
    res.send(report.thumbnail);
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({ message: 'Error fetching thumbnail' });
  }
});

// Preview endpoint with structured sections
app.get('/api/reports/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const report = await Report.findOne({ _id: reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    const pdfData = await pdfParse(report.file);
    const fullText = pdfData.text;
    const sections = splitIntoSections(fullText);

    res.json({
      success: true,
      data: {
        reportName: report.reportName,
        sections: sections,
        metadata: {
          size: report.size,
          lastModified: report.lastModified,
          cost: report.cost,
          totalPages: pdfData.numpages,
        },
      },
    });
  } catch (err) {
    console.error('Preview generation error:', err);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
      errorDetails: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Create new report
app.post('/api/reports', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'samplePdf', maxCount: 1 },
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files['file'] || !files['file'][0]) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const report = new Report({
      ...req.body,
      file: files['file'][0].buffer,
      thumbnail: files['thumbnail'] ? files['thumbnail'][0].buffer : null,
      thumbnailType: files['thumbnail'] ? files['thumbnail'][0].mimetype : null,
      samplePdf: files['samplePdf'] ? files['samplePdf'][0].buffer : null,
      samplePdfType: files['samplePdf'] ? files['samplePdf'][0].mimetype : null,
      size: `${(files['file'][0].size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: 'PDF',
      uploadDate: new Date(),
      lastModified: new Date(),
    });

    await report.save();
    const { file, thumbnail, samplePdf, ...responseReport } = report.toObject();
    res.status(201).json(responseReport);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(400).json({ message: 'Error creating report' });
  }
});

// Update report
app.put('/api/reports/:id', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'samplePdf', maxCount: 1 },
]), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = { ...req.body, lastModified: new Date() };

    if (files && files['file']) {
      updateData.file = files['file'][0].buffer;
      updateData.size = `${(files['file'][0].size / (1024 * 1024)).toFixed(2)} MB`;
    }

    if (files && files['thumbnail']) {
      updateData.thumbnail = files['thumbnail'][0].buffer;
      updateData.thumbnailType = files['thumbnail'][0].mimetype;
    }

    if (files && files['samplePdf']) {
      updateData.samplePdf = files['samplePdf'][0].buffer;
      updateData.samplePdfType = files['samplePdf'][0].mimetype;
    }

    const report = await Report.findOneAndUpdate(
      { _id: reportId },
      updateData,
      { new: true }
    ).select('-file -thumbnail -samplePdf');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(400).json({ message: 'Error updating report' });
  }
});

// Download report
app.get('/api/reports/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const report = await Report.findOne({ _id: reportId });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.reportName}.pdf"`,
    });
    res.send(report.file);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading report' });
  }
});

// Download sample PDF
app.get('/api/reports/:id/sample-pdf', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const report = await Report.findOne({ _id: reportId });

    if (!report || !report.samplePdf) {
      return res.status(404).json({ message: 'Sample PDF not found' });
    }

    res.set({
      'Content-Type': report.samplePdfType || 'application/pdf',
      'Content-Disposition': `attachment; filename="sample-${report.reportName}.pdf"`,
    });
    res.send(report.samplePdf);
  } catch (error) {
    console.error('Error downloading sample PDF:', error);
    res.status(500).json({ message: 'Error downloading sample PDF' });
  }
});

// Delete report
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const report = await Report.findOneAndDelete({ _id: reportId });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting report' });
  }
});

// Query routes
app.post('/api/queries/:queryId/respond', async (req, res) => {
  const { queryId } = req.params;
  const { response, status } = req.body;

  try {
    const query = await CustomerQueries.findById(queryId);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    query.managerResponse = response;
    query.status = status;
    query.respondedAt = new Date();

    await query.save();

    res.json({ success: true, message: 'Response submitted successfully' });
  } catch (error) {
    console.error('Error updating query:', error);
    res.status(500).json({ success: false, message: 'Error submitting response' });
  }
});

app.delete('/api/queries/:queryId', async (req, res) => {
  const { queryId } = req.params;

  try {
    const query = await CustomerQueries.findByIdAndDelete(queryId);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    res.json({ success: true, message: 'Query deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting query' });
  }
});

app.use('/api/manager', managerRoutes);

app.post('/api/potential-customers', async (req, res) => {
  try {
    const { fullName, businessEmail, contactNumber, country, jobTitle, companyName, reportId } = req.body;

    // Validate required fields
    if (!fullName || !businessEmail || !contactNumber || !country || !jobTitle || !companyName || !reportId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create a new potential customer record
    const potentialCustomer = new PotentialCustomers({
      fullName,
      businessEmail,
      contactNumber,
      country,
      jobTitle,
      companyName,
      reportId: new mongoose.Types.ObjectId(reportId), // Convert to ObjectId
    });

    await potentialCustomer.save();

    res.status(201).json({
      success: true,
      message: 'Potential customer data saved successfully',
      data: potentialCustomer,
    });
  } catch (error) {
    console.error('Error saving potential customer data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save potential customer data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Endpoint to filter reports by industry
app.get('/api/reports/industry/:industry', async (req, res) => {
  try {
    const { industry } = req.params;

    // Validate industry parameter
    if (!industry) {
      return res.status(400).json({ message: 'Industry parameter is required' });
    }

    // Fetch reports by industry
    const reports = await Report.find({ industry }).select('-file -thumbnail -samplePdf');

    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for the specified industry' });
    }

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports by industry:', error);
    res.status(500).json({ message: 'Error fetching reports by industry' });
  }
});

// Fetch all potential customers (for admin side)
app.get('/api/potential-customers', async (req, res) => {
  try {
    const potentialCustomers = await PotentialCustomers.find().sort({ createdAt: -1 }); // Sort by latest first

    res.status(200).json({
      success: true,
      data: potentialCustomers,
    });
  } catch (error) {
    console.error('Error fetching potential customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch potential customers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/test-paypal-config', (req, res) => {
  try {
    const config = {
      paypalConfigured: !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_SECRET_KEY,
      mode: process.env.PAYPAL_MODE,
      mongoConnected: mongoose.connection.readyState === 1,
      serverPort: process.env.PORT
    };
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add this route in server.ts
app.get('/api/reports/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid 24-character hex string
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const reportId = new mongoose.Types.ObjectId(id); // Convert to ObjectId
    const report = await Report.findOne({ _id: reportId });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Set headers to display the PDF in the browser
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline', // Display in the browser
    });

    res.send(report.file);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report' });
  }
});

// Add this new endpoint for fetching user's purchased reports
app.get('/api/purchased-reports', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const userId = decoded.userId;

    console.log('\n=== Debug Report Fetching Process ===');
    console.log('1. Looking up reports for userId:', userId);

    // First get user reports
    const userReports = await UserReport.find({ 
      userId,
      isActive: true,
      paymentStatus: 'completed'
    }).lean();

    console.log('2. Found user reports:', JSON.stringify(userReports, null, 2));

    // For each user report, find the corresponding report details
    const populatedReports = await Promise.all(
      userReports.map(async (userReport) => {
        console.log('3. Looking for report with ID:', userReport.reportId);
        
        const report = await Report.findById(userReport.reportId)
          .select('reportName industry description cost size fileType uploadDate')
          .lean();

        console.log('4. Found report:', report ? 'Yes' : 'No');
        
        if (!report) return null;

        // Return combined data
        return {
          _id: userReport._id,
          reportId: {
            _id: report._id,
            reportName: report.reportName,
            industry: report.industry,
            description: report.description,
            cost: report.cost,
            size: report.size,
            fileType: report.fileType,
            uploadDate: report.uploadDate
          },
          purchaseDate: userReport.purchaseDate,
          lastAccessDate: userReport.lastAccessDate,
          accessCount: userReport.accessCount,
          paymentStatus: userReport.paymentStatus,
          isActive: userReport.isActive,
          transactionId: userReport.transactionId
        };
      })
    );

    // Filter out nulls where report wasn't found
    const validReports = populatedReports.filter(report => report !== null);

    console.log('5. Final report count:', validReports.length);
    console.log('6. Final reports:', JSON.stringify(validReports, null, 2));

    res.json({
      success: true,
      reports: validReports
    });
  } catch (error) {
    console.error('Error fetching purchased reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add this endpoint for verifying report access
app.get('/api/verify-access/:reportId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const userId = decoded.userId;
    
    const userReport = await UserReport.findOne({
      userId,
      reportId: new mongoose.Types.ObjectId(req.params.reportId), // Convert to ObjectId
      isActive: true,
      paymentStatus: 'completed'
    });

    if (!userReport) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update access count and last access date
    await userReport.updateAccess();

    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying report access:', error);
    res.status(500).json({ success: false, message: 'Error verifying access' });
  }
});

app.get('/api/payment-details', async (req, res) => {
  try {
    const payments = await PaymentDetails.find()
      .populate('userId', 'fullName email')
      .populate('reportId', 'reportName');
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this endpoint for fetching all user reports with populated data
app.get('/api/user-reports', async (req, res) => {
  try {
    const userReports = await UserReport.find()
      .populate({
        path: 'userId',
        select: 'fullName email' // Only select the fields we need from User
      })
      .populate({
        path: 'reportId',
        select: 'reportName industry' // Only select the fields we need from Report
      })
      .lean();

    if (!userReports || userReports.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No user reports found' 
      });
    }

    res.json({
      success: true,
      data: userReports
    });

  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all blogs
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ publishedDate: -1 }) // Sort by publish date, newest first
      .select('-__v'); // Exclude version key

    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single blog by ID
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }

    const blog = await Blog.findById(id).select('-__v');

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new blog
app.post('/api/blogs', upload.single('thumbnail'), async (req, res) => {
  try {
    const {
      title,
      author,
      publishedDate,
      content,
      thumbnailAlt
    } = req.body;

    const contentArray = JSON.parse(content); // Parse content as it comes from form data

    // Validate required fields
    if (!title || !author || !contentArray || contentArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    // Create new blog with image data
    const blog = new Blog({
      title,
      thumbnail: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        alt: thumbnailAlt || title
      },
      author: JSON.parse(author), // Parse author object from form data
      publishedDate: publishedDate || new Date(),
      content: contentArray
    });

    await blog.save();

    // Return blog data without the binary image data
    const blogObject = blog.toObject();
    const blogResponse = {
      ...blogObject,
      thumbnail: {
        contentType: blogObject.thumbnail.contentType,
        alt: blogObject.thumbnail.alt
      }
    };

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blogResponse
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update blog
app.put('/api/blogs/:id', upload.single('thumbnail'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      publishedDate,
      content,
      thumbnailAlt
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }

    const contentArray = JSON.parse(content); // Parse content as it comes from form data

    // Validate required fields
    if (!title || !author || !contentArray || contentArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Prepare update data
    const updateData: any = {
      title,
      author: JSON.parse(author),
      publishedDate: publishedDate || new Date(),
      content: contentArray
    };

    // If new thumbnail is uploaded, update it
    if (req.file) {
      updateData.thumbnail = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        alt: thumbnailAlt || title
      };
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-thumbnail.data -__v');

    if (!updatedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete blog
app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }

    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get blog thumbnail
app.get('/api/blogs/:id/thumbnail', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }

    const blog = await Blog.findById(id).select('thumbnail');

    if (!blog || !blog.thumbnail || !blog.thumbnail.data) {
      return res.status(404).json({ message: 'Thumbnail not found' });
    }

    res.set('Content-Type', blog.thumbnail.contentType);
    res.send(blog.thumbnail.data);
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching thumbnail',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add these endpoints to your server.ts file

// Submit a leave request
app.post('/api/leaves', async (req, res) => {
  try {
    const { employeeId, fullName, email, phone, fromDate, toDate, reason } = req.body;

    const leave = new Leaves({
      employeeId,
      fullName,
      email,
      phone,
      fromDate,
      toDate,
      reason
    });

    await leave.save();

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leave
    });
  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting leave request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all leaves (for manager)
app.get('/api/leaves', async (req, res) => {
  try {
    const leaves = await Leaves.find()
      .sort({ appliedDate: -1 }); // Sort by latest first

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaves',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get leaves for a specific employee
app.get('/api/leaves/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const leaves = await Leaves.find({ employeeId })
      .sort({ appliedDate: -1 });

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching employee leaves:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee leaves',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update leave status (approve/deny)
app.patch('/api/leaves/:leaveId/status', async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, comments, managerId } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status specified'
      });
    }

    const leave = await Leaves.findByIdAndUpdate(
      leaveId,
      {
        status,
        comments,
        responseDate: new Date(),
        responseBy: managerId
      },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: leave
    });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating leave status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});