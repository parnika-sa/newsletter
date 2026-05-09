const fs = require('fs');
const files = ['App.jsx', 'Admin.jsx', 'Verify.jsx', 'Unsubscribe.jsx'];
files.forEach(file => {
  const path = 'c:/Users/User/Desktop/new/frontend/src/' + file;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/'http:\/\/localhost:5000/g, "(import.meta.env.VITE_API_URL || 'http://localhost:5000') + '");
  content = content.replace(/`http:\/\/localhost:5000/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + `");
  fs.writeFileSync(path, content);
});
console.log('Replaced localhost:5000 in frontend files');
