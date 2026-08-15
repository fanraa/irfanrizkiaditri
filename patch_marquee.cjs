const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf-8');

const oldMarquee = /@keyframes sliding-text \{[\s\S]*?\.animate-sliding-text \{[\s\S]*?\}\n\}/;

const newMarquee = `@keyframes sliding-text {
  from { transform: translateX(200px); }
  to { transform: translateX(-100%); }
}

.animate-sliding-text {
  display: inline-block;
  white-space: nowrap;
  animation: sliding-text 12s linear infinite;
}

@media (min-width: 640px) {
  @keyframes sliding-text-sm {
    from { transform: translateX(350px); }
    to { transform: translateX(-100%); }
  }
  .animate-sliding-text {
    animation: sliding-text-sm 15s linear infinite;
  }
}`;

code = code.replace(/@keyframes sliding-text \{[\s\S]*?\.animate-sliding-text \{[\s\S]*?\}\n\}/, newMarquee);

fs.writeFileSync('src/index.css', code);
