// Builds and queries the search indexes off the main thread (see js/search-core.js).
importScripts('search-core.js');

const indexes = {}; // scope ('vachanamrut' | 'shikshapatri') -> index

self.onmessage = ({ data }) => {
    if (data.type === 'build') {
        indexes[data.scope] = SearchCore.buildIndex(data.docs);
        self.postMessage({ type: 'ready', scope: data.scope });
    } else if (data.type === 'search') {
        const index = indexes[data.scope];
        if (!index) {
            self.postMessage({ type: 'results', id: data.id, pending: true, results: [] });
            return;
        }
        const results = SearchCore.search(index, data.query).map(r => {
            const doc = index.docs[r.docIndex];
            // Excerpt from the fields in the order the page prefers (current language first)
            let snip = null, field = null;
            for (const f of data.snippetFields) {
                snip = SearchCore.snippet(doc.fields[f], r.matchedKeys);
                if (snip) { field = f; break; }
            }
            return { id: doc.id, score: r.score, count: r.count, matchedKeys: r.matchedKeys, snippet: snip, field };
        });
        self.postMessage({ type: 'results', id: data.id, results });
    }
};
