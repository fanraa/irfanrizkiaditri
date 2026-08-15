const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  'import { collection, getDocs, writeBatch, doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";',
  'import { collection, getDocs, writeBatch, doc, updateDoc, increment, getDoc, setDoc, addDoc } from "firebase/firestore";'
);

fs.writeFileSync('src/context/AudioContext.tsx', code);
