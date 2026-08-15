const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  /<div className="fixed top-\[-9999px\] left-\[-9999px\] opacity-0 pointer-events-none w-\[1px\] h-\[1px\] overflow-hidden">/g,
  '<div className="fixed top-0 left-0 w-[200px] h-[200px] pointer-events-none opacity-0 -z-50">'
);
code = code.replace(/height: '1',/g, "height: '200',");
code = code.replace(/width: '1',/g, "width: '200',");

fs.writeFileSync('src/context/AudioContext.tsx', code);
