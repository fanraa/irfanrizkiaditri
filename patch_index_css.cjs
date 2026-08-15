const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf-8');

if (!code.includes('animate-sliding-text')) {
  code += `\n
@keyframes sliding-text {
  0%, 10% { transform: translateX(0); }
  50%, 60% { transform: translateX(calc(-100% + 180px)); }
  100% { transform: translateX(0); }
}

.animate-sliding-text {
  display: inline-block;
  white-space: nowrap;
  animation: sliding-text 10s linear infinite;
}

@media (min-width: 640px) {
  @keyframes sliding-text-sm {
    0%, 10% { transform: translateX(0); }
    50%, 60% { transform: translateX(calc(-100% + 320px)); }
    100% { transform: translateX(0); }
  }
  .animate-sliding-text {
    animation: sliding-text-sm 15s linear infinite;
  }
}
`;
  fs.writeFileSync('src/index.css', code);
}
