// Mihon / Tachiyomi Custom Categories & Tracking Manager for Stremio (Single Category Mode)
const React = require('react');
const EventEmitter = require('eventemitter3');

const CATEGORIES_STORAGE_KEY = 'stremio_mihon_categories';
const ITEM_CATEGORIES_STORAGE_KEY = 'stremio_mihon_item_categories';
const LIBRARY_CACHE_KEY = 'stremio_mihon_library_cache';

const DEFAULT_CATEGORIES = [
    'Watching',
    'Plan to Watch',
    'Completed',
    'On Hold',
    'Dropped'
];

class MihonCategoryManager extends EventEmitter {
    constructor() {
        super();
        this._categories = this._loadCategories();
        this._itemCategories = this._loadItemCategories();
        this._libraryCatalog = this._loadLibraryCatalog();
    }

    _loadCategories() {
        try {
            const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to load Mihon categories:', e);
        }
        return [...DEFAULT_CATEGORIES];
    }

    _saveCategories() {
        try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(this._categories));
        } catch (e) {
            console.error('Failed to save Mihon categories:', e);
        }
    }

    _loadItemCategories() {
        try {
            const raw = localStorage.getItem(ITEM_CATEGORIES_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    const normalized = {};
                    for (const id in parsed) {
                        const val = parsed[id];
                        if (Array.isArray(val) && val.length > 0) {
                            normalized[id] = val[0];
                        } else if (typeof val === 'string' && val.trim().length > 0) {
                            normalized[id] = val.trim();
                        }
                    }
                    return normalized;
                }
            }
        } catch (e) {
            console.error('Failed to load Mihon item categories:', e);
        }
        return {};
    }

    _saveItemCategories() {
        try {
            localStorage.setItem(ITEM_CATEGORIES_STORAGE_KEY, JSON.stringify(this._itemCategories));
        } catch (e) {
            console.error('Failed to save Mihon item categories:', e);
        }
    }

    _loadLibraryCatalog() {
        try {
            const raw = localStorage.getItem(LIBRARY_CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to load library catalog cache:', e);
        }
        return [];
    }

    _saveLibraryCatalog() {
        try {
            localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(this._libraryCatalog));
        } catch (e) {
            console.error('Failed to save library catalog cache:', e);
        }
    }

    setLibraryCatalog(items) {
        if (!Array.isArray(items) || items.length === 0) return;
        const itemMap = new Map();
        // Retain existing items
        for (const item of this._libraryCatalog) {
            if (item && (item._id || item.id)) {
                itemMap.set(item._id || item.id, item);
            }
        }
        // Merge in new/updated items
        for (const item of items) {
            const id = item._id || item.id;
            if (id) {
                const existing = itemMap.get(id);
                itemMap.set(id, {
                    ...(existing || {}),
                    _id: id,
                    id: id,
                    name: item.name || existing?.name,
                    type: item.type || existing?.type,
                    poster: item.poster || existing?.poster,
                    posterShape: item.posterShape || existing?.posterShape || 'poster',
                    deepLinks: item.deepLinks || existing?.deepLinks,
                    progress: typeof item.progress === 'number' ? item.progress : (existing?.progress || 0),
                    watched: typeof item.watched === 'boolean' ? item.watched : existing?.watched,
                });
            }
        }
        this._libraryCatalog = Array.from(itemMap.values());
        this._saveLibraryCatalog();
        this.autoAssignWatched(this._libraryCatalog);
        this.emit('change');
    }

    addCatalogItem(item) {
        if (!item) return;
        const id = item._id || item.id;
        if (!id) return;
        const existingIdx = this._libraryCatalog.findIndex((x) => (x._id || x.id) === id);
        if (existingIdx !== -1) {
            this._libraryCatalog[existingIdx] = {
                ...this._libraryCatalog[existingIdx],
                ...item
            };
        } else {
            this._libraryCatalog.push({
                _id: id,
                id: id,
                name: item.name,
                type: item.type,
                poster: item.poster,
                posterShape: item.posterShape || 'poster',
                ...item
            });
        }
        this._saveLibraryCatalog();
    }

    getLibraryCatalog() {
        return [...this._libraryCatalog];
    }

    getCategories() {
        return [...this._categories];
    }

    addCategory(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return false;
        if (this._categories.includes(trimmed)) return false;

        this._categories.push(trimmed);
        this._saveCategories();
        this.emit('change');
        return true;
    }

    removeCategory(name) {
        const index = this._categories.indexOf(name);
        if (index === -1) return false;

        this._categories.splice(index, 1);
        this._saveCategories();

        let modified = false;
        for (const id in this._itemCategories) {
            if (this._itemCategories[id] === name) {
                delete this._itemCategories[id];
                modified = true;
            }
        }
        if (modified) {
            this._saveItemCategories();
        }

        this.emit('change');
        return true;
    }

    renameCategory(oldName, newName) {
        const trimmed = (newName || '').trim();
        if (!trimmed || trimmed === oldName) return false;
        if (this._categories.includes(trimmed)) return false;

        const index = this._categories.indexOf(oldName);
        if (index === -1) return false;

        this._categories[index] = trimmed;
        this._saveCategories();

        let modified = false;
        for (const id in this._itemCategories) {
            if (this._itemCategories[id] === oldName) {
                this._itemCategories[id] = trimmed;
                modified = true;
            }
        }
        if (modified) {
            this._saveItemCategories();
        }

        this.emit('change');
        return true;
    }

    getItemCategory(itemId, isWatched = false) {
        if (!itemId) return null;
        const cat = this._itemCategories[itemId];
        if (cat && this._categories.includes(cat)) {
            return cat;
        }
        if (isWatched && this._categories.includes('Completed')) {
            return 'Completed';
        }
        return null;
    }

    getItemCategories(itemId, isWatched = false) {
        const cat = this.getItemCategory(itemId, isWatched);
        return cat ? [cat] : [];
    }

    setItemCategory(itemId, categoryName, itemMeta = null) {
        if (!itemId) return;
        if (!categoryName || !this._categories.includes(categoryName)) {
            delete this._itemCategories[itemId];
        } else {
            this._itemCategories[itemId] = categoryName;
            if (itemMeta) {
                this.addCatalogItem({ ...itemMeta, _id: itemId, id: itemId });
            }
        }
        this._saveItemCategories();
        this.emit('change');
    }

    autoAssignWatched(items) {
        if (!Array.isArray(items)) return;
        let modified = false;
        for (const item of items) {
            const id = item._id || item.id;
            const isWatched = Boolean(item.watched || item.state?.flaggedWatched === 1 || (item.state?.timesWatched && item.state.timesWatched > 0));
            if (id && isWatched && !this._itemCategories[id] && this._categories.includes('Completed')) {
                this._itemCategories[id] = 'Completed';
                modified = true;
            }
        }
        if (modified) {
            this._saveItemCategories();
            this.emit('change');
        }
    }

    toggleItemCategory(itemId, categoryName) {
        if (!itemId) return;
        const current = this.getItemCategory(itemId);
        if (current === categoryName) {
            this.setItemCategory(itemId, null);
        } else {
            this.setItemCategory(itemId, categoryName);
        }
    }

    hasCategory(itemId, categoryName) {
        if (!itemId || !categoryName) return false;
        return this.getItemCategory(itemId) === categoryName;
    }

    getAllItemMappings() {
        return { ...this._itemCategories };
    }

    openCategoryModal(item) {
        this.emit('open-modal', item);
    }
}

const categoryManager = new MihonCategoryManager();

function useMihonCategories() {
    const [, setTick] = React.useState(0);

    React.useEffect(() => {
        const handler = () => setTick((t) => t + 1);
        categoryManager.on('change', handler);
        return () => {
            categoryManager.off('change', handler);
        };
    }, []);

    return {
        categories: categoryManager.getCategories(),
        itemCategories: categoryManager.getAllItemMappings(),
        libraryCatalog: categoryManager.getLibraryCatalog(),
        setLibraryCatalog: (items) => categoryManager.setLibraryCatalog(items),
        addCatalogItem: (item) => categoryManager.addCatalogItem(item),
        getCategories: () => categoryManager.getCategories(),
        addCategory: (name) => categoryManager.addCategory(name),
        removeCategory: (name) => categoryManager.removeCategory(name),
        renameCategory: (oldName, newName) => categoryManager.renameCategory(oldName, newName),
        getItemCategory: (id, isWatched) => categoryManager.getItemCategory(id, isWatched),
        getItemCategories: (id, isWatched) => categoryManager.getItemCategories(id, isWatched),
        setItemCategory: (id, cat) => categoryManager.setItemCategory(id, cat),
        toggleItemCategory: (id, cat) => categoryManager.toggleItemCategory(id, cat),
        hasCategory: (id, cat) => categoryManager.hasCategory(id, cat),
        autoAssignWatched: (items) => categoryManager.autoAssignWatched(items),
        openCategoryModal: (item) => categoryManager.openCategoryModal(item)
    };
}

module.exports = {
    categoryManager,
    useMihonCategories,
    DEFAULT_CATEGORIES
};
