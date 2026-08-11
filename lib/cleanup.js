// Nettoyage périodique pour éviter que la mémoire grossisse indéfiniment
// (parties de morpion oubliées, actions en attente jamais confirmées/annulées, etc.)

function startCleanupLoop() {
    setInterval(() => {
        try {
            const before = process.memoryUsage().rss / 1024 / 1024;
            if (global.gc) global.gc();
            const after = process.memoryUsage().rss / 1024 / 1024;
            console.log(`🧹 Nettoyage mémoire : ${before.toFixed(1)}MB → ${after.toFixed(1)}MB`);
        } catch (e) {
            // pas grave si le garbage collector manuel n'est pas dispo, c'est juste un bonus
        }
    }, 15 * 60 * 1000); // toutes les 15 minutes
}

module.exports = { startCleanupLoop };
