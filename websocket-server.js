const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Connect to MongoDB
mongoose.connect('mongodb+srv://helio-fos:F61m6zaMeGt3tmkc@raiseds25.gxwp27k.mongodb.net/?retryWrites=true&w=majority&appName=RaiseDS25', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define Submission schema
const SubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  topic: { type: String, required: true },
  abstract: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  institution: { type: String, required: true },
});
const Submission = mongoose.model('Submission', SubmissionSchema);

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for frontend communication

// Endpoint to collect submissions
app.post('/submit', async (req, res) => {
  try {
    const { name, topic, abstract, email, mobile, institution } = req.body;

    // Basic validation
    if (!name || !topic || !abstract || !email || !mobile || !institution) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate mobile number: must start with +91 and have exactly 10 digits
    if (!mobile.startsWith('+91') || mobile.length !== 13) {
      return res.status(400).json({
        message: 'Invalid mobile number. Must start with +91 and have 10 digits.',
      });
    }

    // Create and save new submission
    const newSubmission = new Submission({
      name,
      topic,
      abstract,
      email,
      mobile,
      institution,
    });
    await newSubmission.save();

    res.status(201).json({
      message: 'Submission saved successfully',
      submission: newSubmission,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});