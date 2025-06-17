const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8
  },
  studentId: {
    type: String,
    required: [false, 'Student ID is required'],
  },
  profilePicture: {
    url: {
        type: String,
        default: 'default-profile.png'  // Default profile picture
    }
  },
  collegeIdImage: {
    url: String,
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING'
    },
    verifiedAt: Date
  },
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
    default: 'INACTIVE'
  },
    verifiedStudentData: {
    studentName: { type: String },
    studentNumber: { type: String },
    college: { type: String },
    yearLevel: { type: String },
    enrollmentStatus: {
      type: String,
    },
    verifiedFromQR: {
      type: Boolean,
      default: false
    }
  },

  
  qrScanSource: {
    type: String
  },
  resetPasswordToken: String,
resetPasswordExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);