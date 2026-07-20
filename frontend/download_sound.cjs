const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'sounds');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const fileUrl = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
const filePath = path.join(dir, 'ting.ogg');

const file = fs.createWriteStream(filePath);
https.get(fileUrl, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log('Download hoàn tất: ting.ogg');
  });
}).on('error', function(err) {
  fs.unlink(filePath);
  console.error('Lỗi tải file:', err.message);
});
