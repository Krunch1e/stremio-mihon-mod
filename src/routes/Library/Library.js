// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const { useLocation, useParams, useNavigate } = require('react-router');
const { useSearchParams } = require('react-router-dom');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const NotFound = require('stremio/routes/NotFound');
const { useProfile, useNotifications, useOnScrollToBottom, withCoreSuspender } = require('stremio/common');
const { default: toPath } = require('stremio-router/toPath');
const { DelayedRenderer, Chips, Image, MainNavBars, LibItem, MultiselectMenu } = require('stremio/components');
const { default: Button } = require('stremio/components/Button');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { MihonCategoryBar, CategoryAssignmentModal, CategoryManagerModal } = require('stremio/components/MihonCategoryBar');
const { categoryManager, useMihonCategories } = require('stremio/common/MihonCategories');
const { ratingsService, useRatings } = require('stremio/common/RatingsService');
const { default: Placeholder } = require('./Placeholder');
const useLibrary = require('./useLibrary');
const useSelectableInputs = require('./useSelectableInputs');
const styles = require('./styles');

const SCROLL_TO_BOTTOM_TRESHOLD = 400;

function withModel(Library) {
    const LibraryWithModel = () => {
        const location = useLocation();
        const model = React.useMemo(() => {
            return typeof location.pathname === 'string' ?
                location.pathname.match('/library') ?
                    'library'
                    :
                    location.pathname.match('/continuewatching') ?
                        'continue_watching'
                        :
                        null
                :
                null;
        }, [location?.pathname]);

        if (model === null) return <NotFound />;

        return <Library model={model} />;
    };
    LibraryWithModel.displayName = 'LibraryWithModel';
    return LibraryWithModel;
}

const Library = ({ model }) => {
    const { type } = useParams();
    const urlParams = React.useMemo(() => ({
        type
    }), [type]);
    const [queryParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const profile = useProfile();
    const notifications = useNotifications();
    const [library, loadNextPage] = useLibrary(model, urlParams, queryParams);
    const [typeSelect, sortChips, hasNextPage] = useSelectableInputs(library);
    const scrollContainerRef = React.useRef(null);

    // Mihon Category, Genre, Rating & Search state
    const [activeCategory, setActiveCategory] = React.useState('ALL');
    const [selectedType, setSelectedType] = React.useState('ALL');
    const [selectedGenre, setSelectedGenre] = React.useState('ALL');
    const [customSort, setCustomSort] = React.useState(null); // 'imdbRating' or null
    const [searchQuery, setSearchQuery] = React.useState('');
    const [assignmentModalItem, setAssignmentModalItem] = React.useState(null);
    const [isManagerModalOpen, setIsManagerModalOpen] = React.useState(false);

    const { categories, getItemCategory, setLibraryCatalog } = useMihonCategories();
    const { allCache } = useRatings();

    // Listen for category modal open requests from LibItem context menu or right-click
    React.useEffect(() => {
        const handleOpenModal = (item) => {
            setAssignmentModalItem(item);
        };
        categoryManager.on('open-modal', handleOpenModal);
        return () => {
            categoryManager.off('open-modal', handleOpenModal);
        };
    }, []);

    // Feed library catalog items to background fetcher and save persistent catalog cache
    React.useEffect(() => {
        if (Array.isArray(library.catalog) && library.catalog.length > 0) {
            ratingsService.queueBatch(library.catalog);
            setLibraryCatalog(library.catalog);
        }
    }, [library.catalog, setLibraryCatalog]);

    // Collect all unique genres present in user's library items
    const availableGenres = React.useMemo(() => {
        if (!Array.isArray(library.catalog)) return [];
        const set = new Set();
        for (const item of library.catalog) {
            const genres = ratingsService.getGenres(item._id);
            for (const g of genres) {
                if (g && typeof g === 'string') set.add(g.trim());
            }
        }
        return Array.from(set).sort();
    }, [library.catalog, allCache]);

    const typeOptions = React.useMemo(() => [
        { value: 'ALL', label: 'All' },
        { value: 'movie', label: 'Movie' },
        { value: 'series', label: 'Series' }
    ], []);

    const genreOptions = React.useMemo(() => [
        { value: 'ALL', label: 'All Genres' },
        ...availableGenres.map((g) => ({ value: g, label: g }))
    ], [availableGenres]);

    // Calculate single-category counts dynamically from loaded catalog
    const itemCounts = React.useMemo(() => {
        const counts = {};
        for (const cat of categories) {
            counts[cat] = 0;
        }
        let uncategorized = 0;
        if (Array.isArray(library.catalog)) {
            for (const item of library.catalog) {
                const cat = getItemCategory(item._id, item.watched);
                if (!cat) {
                    uncategorized++;
                } else {
                    counts[cat] = (counts[cat] || 0) + 1;
                }
            }
        }
        counts['_UNCATEGORIZED'] = uncategorized;
        return counts;
    }, [categories, getItemCategory, library.catalog]);

    // Filter catalog items in real-time by Category, Genre, and Search Query
    const filteredCatalog = React.useMemo(() => {
        if (!Array.isArray(library.catalog)) return [];
        if (model !== 'library') return library.catalog;

        let result = library.catalog.filter((item) => {
            // 0. Type filter (All / Movie / Series)
            if (selectedType !== 'ALL') {
                if (item.type !== selectedType) return false;
            }
            // 1. Category filter (Single category mode with auto-completed support)
            const cat = getItemCategory(item._id, item.watched);
            if (activeCategory === 'UNCATEGORIZED') {
                if (cat) return false;
            } else if (activeCategory !== 'ALL') {
                if (cat !== activeCategory) return false;
            }

            // 2. Genre filter
            if (selectedGenre !== 'ALL') {
                const itemGenres = ratingsService.getGenres(item._id);
                if (!itemGenres.includes(selectedGenre)) return false;
            }

            // 3. Real-time Search filter
            if (searchQuery.trim().length > 0) {
                const query = searchQuery.toLowerCase().trim();
                const name = (item.name || '').toLowerCase();
                if (!name.includes(query)) return false;
            }

            return true;
        });

        // 4. Custom Sort (IMDb Rating: High to Low)
        if (customSort === 'imdbRating') {
            result = [...result].sort((a, b) => {
                const ratingA = ratingsService.getRating(a._id) ?? -1;
                const ratingB = ratingsService.getRating(b._id) ?? -1;
                return ratingB - ratingA;
            });
        }

        return result;
    }, [library.catalog, model, selectedType, activeCategory, selectedGenre, customSort, searchQuery, getItemCategory, allCache]);

    const onScrollToBottom = React.useCallback(() => {
        if (hasNextPage) {
            loadNextPage();
        }
    }, [hasNextPage, loadNextPage]);
    const onScroll = useOnScrollToBottom(onScrollToBottom, SCROLL_TO_BOTTOM_TRESHOLD);

    React.useLayoutEffect(() => {
        if (scrollContainerRef.current !== null && library.selected && library.selected.request.page === 1 && library.catalog.length !== 0) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [profile.auth, library.selected]);



    return (
        <MainNavBars className={styles['library-container']} route={model}>
            {
                profile.auth !== null ?
                    <div className={styles['library-content']}>
                        {/* Row 1: Mihon Category Tabs */}
                        {
                            model === 'library' && (
                                <MihonCategoryBar
                                    activeCategory={activeCategory}
                                    onSelectCategory={setActiveCategory}
                                    totalCount={library.catalog?.length || 0}
                                    itemCounts={itemCounts}
                                    onOpenManager={() => setIsManagerModalOpen(true)}
                                />
                            )
                        }

                        {/* Row 2: Clean, Leveled Controls Toolbar */}
                        <div className={styles['library-toolbar']}>
                            <div className={styles['controls-group']}>
                                <MultiselectMenu options={typeOptions} value={selectedType} onSelect={(val) => setSelectedType(val)} className={styles['type-select']} />
                                {
                                    model === 'library' && availableGenres.length > 0 && (
                                        <MultiselectMenu
                                            options={genreOptions}
                                            value={selectedGenre}
                                            onSelect={(val) => setSelectedGenre(val)}
                                            className={styles['genre-select']}
                                        />
                                    )
                                }
                                <div className={styles['divider']} />
                                <Chips {...sortChips} className={styles['sort-chips']} />
                                {
                                    model === 'library' && (
                                        <div
                                            className={classnames(styles['imdb-sort-btn'], {
                                                [styles['active']]: customSort === 'imdbRating'
                                            })}
                                            onClick={() => setCustomSort((s) => (s === 'imdbRating' ? null : 'imdbRating'))}
                                            title="Sort titles by highest IMDb rating"
                                        >
                                            ★ IMDb Top
                                        </div>
                                    )
                                }
                            </div>

                            {
                                model === 'library' && (
                                    <div className={styles['search-group']}>
                                        <div className={styles['search-box']}>
                                            <Icon className={styles['search-icon']} name="search" />
                                            <input
                                                type="text"
                                                placeholder="Search titles in library..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={styles['search-input']}
                                            />
                                            {searchQuery.length > 0 && (
                                                <Button
                                                    className={styles['clear-icon-btn']}
                                                    onClick={() => setSearchQuery('')}
                                                    title="Clear search"
                                                >
                                                    <Icon className={styles['clear-icon']} name="close" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className={styles['filter-count']}>
                                            {filteredCatalog.length} {filteredCatalog.length === 1 ? 'item' : 'items'}
                                        </div>
                                    </div>
                                )
                            }
                        </div>

                        {
                            library.selected === null ?
                                <DelayedRenderer delay={500}>
                                    <div className={styles['message-container']}>
                                        <Image
                                            className={styles['image']}
                                            src={require('/assets/images/empty.png')}
                                            alt={' '}
                                        />
                                        <div className={styles['message-label']}>{model === 'library' ? t('LIBRARY_NOT_LOADED') : t('BOARD_CONTINUE_WATCHING_NOT_LOADED')}</div>
                                    </div>
                                </DelayedRenderer>
                                :
                                library.catalog.length === 0 ?
                                    <div className={styles['message-container']}>
                                        <Image
                                            className={styles['image']}
                                            src={require('/assets/images/empty.png')}
                                            alt={' '}
                                        />
                                        <div className={styles['message-label']}>{model === 'library' ? t('LIBRARY_EMPTY') : t('BOARD_CONTINUE_WATCHING_EMPTY')}</div>
                                    </div>
                                    :
                                    filteredCatalog.length === 0 ?
                                        <div className={styles['message-container']}>
                                            <Image
                                                className={styles['image']}
                                                src={require('/assets/images/empty.png')}
                                                alt={' '}
                                            />
                                            <div className={styles['message-label']}>No matching titles found</div>
                                            <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1rem' }}>
                                                {searchQuery ? `No results for "${searchQuery}" with active filters` : `No titles match your current category/genre filter`}
                                            </div>
                                            <Button
                                                style={{
                                                    padding: '0.6rem 1.5rem',
                                                    borderRadius: '9999px',
                                                    backgroundColor: '#735ce6',
                                                    color: '#ffffff',
                                                    fontWeight: '600',
                                                    fontSize: '0.95rem'
                                                }}
                                                onClick={() => {
                                                    setActiveCategory('ALL');
                                                    setSelectedGenre('ALL');
                                                    setSelectedType('ALL');
                                                    setCustomSort(null);
                                                    setSearchQuery('');
                                                }}
                                            >
                                                Reset All Filters
                                            </Button>
                                        </div>
                                        :
                                        <div ref={scrollContainerRef} className={classnames(styles['meta-items-container'], 'animation-fade-in')} onScroll={onScroll}>
                                            {
                                                filteredCatalog.map((libItem, index) => (
                                                    <LibItem
                                                        {...libItem}
                                                        key={libItem._id || index}
                                                        notifications={notifications}
                                                        removable={model === 'library'}
                                                        detailsVideosFirst={model === 'library'}
                                                    />
                                                ))
                                            }
                                        </div>
                        }
                        {
                            assignmentModalItem && (
                                <CategoryAssignmentModal
                                    item={assignmentModalItem}
                                    onClose={() => setAssignmentModalItem(null)}
                                />
                            )
                        }
                        {
                            isManagerModalOpen && (
                                <CategoryManagerModal
                                    onClose={() => setIsManagerModalOpen(false)}
                                    itemCounts={itemCounts}
                                />
                            )
                        }
                    </div>
                    :
                    <Placeholder />
            }
        </MainNavBars>
    );
};

Library.propTypes = {
    model: PropTypes.oneOf(['library', 'continue_watching']),
};

const LibraryFallback = ({ model }) => (
    <MainNavBars className={styles['library-container']} route={model} />
);

LibraryFallback.propTypes = Library.propTypes;

module.exports = withModel(withCoreSuspender(Library, LibraryFallback));
