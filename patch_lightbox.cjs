const fs = require('fs');
let code = fs.readFileSync('src/pages/Gallery.tsx', 'utf-8');

const target = `<ImageWithSkeleton
                src={selectedPhoto.src}
                alt={selectedPhoto.caption || "Gallery preview"}
                className="max-w-full max-h-[60vh] sm:max-h-[65vh] object-contain select-none cursor-pointer rounded-lg shadow-xl"
                draggable={false}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOverlay(prev => !prev);
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />`;

const replacement = `<AnimatePresence mode="popLayout" custom={direction}>
                <motion.div
                  key={selectedPhoto.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 100 : -100, rotate: direction > 0 ? 8 : -8 }}
                  animate={{ opacity: 1, x: 0, rotate: 0 }}
                  exit={{ opacity: 0, x: direction < 0 ? 100 : -100, rotate: direction < 0 ? 8 : -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex justify-center items-center w-full"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <ImageWithSkeleton
                    src={selectedPhoto.src}
                    alt={selectedPhoto.caption || "Gallery preview"}
                    className="max-w-full max-h-[60vh] sm:max-h-[65vh] object-contain select-none cursor-pointer rounded-lg shadow-2xl"
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOverlay(prev => !prev);
                    }}
                  />
                </motion.div>
              </AnimatePresence>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/Gallery.tsx', code);
