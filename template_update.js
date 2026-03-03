const fs = require('fs');
let html = fs.readFileSync('core/templates/avatar_prototype.html', 'utf-8');
html = html.replace('160px', '160px'); // Quick touch event
fs.writeFileSync('core/templates/avatar_prototype.html', html);
