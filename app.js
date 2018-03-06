const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const multerGridFs = require('multer-gridfs-storage');
const multerGridFsStream = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');


const mongoURI = 'mongodb://stefan:123@ds259258.mlab.com:59258/mongo-sharefiles';

const connect = mongoose.createConnection(mongoURI);
let gfs;

connect.once('open', () => {
  gfs = multerGridFsStream(connect.db, mongoose.mongo);
  gfs.collection('uploads');
})

const storage = new multerGridFs({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({
  storage
});

// GET ROUTE

app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      res.render('index', {
        files: false
      });
    } else {
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', {
        files: files
      });
    }

  });
});


// POST /upload
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({
    file: req.file
  });
});


// GET /file
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    return res.json(files);
  });
});


// Get /files/:filename
// GET /file
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({
    filename: req.params.filename
  }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exist'
      });
    }

    return res.json(file);
  });
});

// Get /image/:filename
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({
    filename: req.params.filename
  }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// DELETE req
app.delete('/files/:id', (req, res) => {
  gfs.remove({
    _id: req.params.id,
    root: 'uploads'
  }, (err, multerGridFs) => {
    if (err) {
      return res.status(404).json({
        err: err
      });
    }

    res.redirect('/');
  });
});


const port = 7777;

app.listen(port, () => console.log(`Server started on port ${port}`));