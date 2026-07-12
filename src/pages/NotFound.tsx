import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

const VALID_ROUTES = ['/', '/projects', '/lab', '/gallery', '/music', '/blog', '/contact', '/privacy', '/terms', '/about'];

// Simple Levenshtein distance for fuzzy matching
function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

function findClosestRoute(path: string) {
  let minDistance = Infinity;
  let closest = '';
  // exclude '/' from suggestions if they typed something long
  const targets = VALID_ROUTES.filter(r => r !== '/');
  
  for (const route of targets) {
    const routeName = route.substring(1); // remove leading slash
    const pathName = path.substring(1); // remove leading slash
    const distance = getLevenshteinDistance(pathName, routeName);
    if (distance < minDistance) {
      minDistance = distance;
      closest = route;
    }
  }
  
  // if it's too far off, maybe default to home
  if (minDistance > 5) return '/';
  return closest;
}

export function NotFound() {
  const location = useLocation();
  const [suggestion, setSuggestion] = useState<string>('');

  useEffect(() => {
    setSuggestion(findClosestRoute(location.pathname));
  }, [location.pathname]);

  const suggestionText = suggestion === '/' ? 'home' : suggestion.substring(1);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center"
    >
      <div className="text-center px-4 font-display">
        <p className="text-sm text-slate-600 font-medium tracking-tight">
          the page '{location.pathname}' could not be found.
        </p>
        <p className="text-sm text-slate-600 mt-1 font-medium tracking-tight">
          perhaps you meant{' '}
          <Link to={suggestion} className="text-blue-600 hover:text-blue-700 transition-all lowercase">
            {suggestionText}
          </Link>
          ?
        </p>
      </div>
    </motion.div>
  );
}
