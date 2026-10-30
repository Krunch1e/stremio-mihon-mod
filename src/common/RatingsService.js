// Service for fetching and caching IMDb ratings and genres from Cinemeta
const React = require('react');
const EventEmitter = require('eventemitter3');

const METADATA_STORAGE_KEY = 'stremio_mihon_metadata_cache';

class RatingsService extends EventEmitter {
    constructor() {
        super();
        this._cache = this._loadCache();
        this._queue = [];
        this._activeFetches = 0;
        this._maxConcurrent = 4;
        this._inProgress = new Set();
    }

    _loadCache() {
        try {
            const raw = localStorage.getItem(METADATA_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to load ratings cache:', e);
        }
        return {};
    }

    _saveCache() {
        try {
            localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(this._cache));
        } catch (e) {
            console.error('Failed to save ratings cache:', e);
        }
    }

    get(id) {
        if (!id) return null;
        return this._cache[id] || null;
    }

    getRating(id) {
        const item = this.get(id);
        return item ? item.rating : null;
    }

    getGenres(id) {
        const item = this.get(id);
        return item && Array.isArray(item.genres) ? item.genres : [];
    }

    getAllCache() {
        return this._cache;
    }

    queueBatch(items) {
        if (!Array.isArray(items)) return;
        let hasNew = false;
        for (const item of items) {
            const id = item._id || item.id;
            if (!id || this._cache[id] || this._inProgress.has(id)) continue;
            // Only fetch for IMDb ids (starts with tt)
            if (typeof id === 'string' && id.startsWith('tt')) {
                this._queue.push({
                    id,
                    type: item.type === 'series' ? 'series' : 'movie'
                });
                this._inProgress.add(id);
                hasNew = true;
            }
        }

        if (hasNew) {
            this._processQueue();
        }
    }

    _processQueue() {
        while (this._activeFetches < this._maxConcurrent && this._queue.length > 0) {
            const { id, type } = this._queue.shift();
            this._activeFetches++;
            this._fetchMetadata(id, type)
                .finally(() => {
                    this._activeFetches--;
                    this._inProgress.delete(id);
                    this._processQueue();
                });
        }
    }

    async _fetchMetadata(id, type) {
        const url = `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.meta) {
                    const ratingStr = data.meta.imdbRating;
                    const rating = ratingStr ? parseFloat(ratingStr) : null;
                    const genres = Array.isArray(data.meta.genres) ? data.meta.genres : [];
                    const year = data.meta.year || null;

                    this._cache[id] = {
                        rating: isNaN(rating) ? null : rating,
                        genres: genres,
                        year: year,
                        fetchedAt: Date.now()
                    };

                    this._saveCache();
                    this.emit('change', id);
                }
            }
        } catch (e) {
            // Silently ignore network failures for individual items
        }
    }
}

const ratingsService = new RatingsService();

function useRatings() {
    const [, setTick] = React.useState(0);

    React.useEffect(() => {
        let timer = null;
        const handler = () => {
            // Debounce update notifications to avoid excessive re-renders during batch fetches
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                setTick((t) => t + 1);
            }, 300);
        };
        ratingsService.on('change', handler);
        return () => {
            if (timer) clearTimeout(timer);
            ratingsService.off('change', handler);
        };
    }, []);

    return {
        get: (id) => ratingsService.get(id),
        getRating: (id) => ratingsService.getRating(id),
        getGenres: (id) => ratingsService.getGenres(id),
        queueBatch: (items) => ratingsService.queueBatch(items),
        allCache: ratingsService.getAllCache()
    };
}

module.exports = {
    ratingsService,
    useRatings
};
