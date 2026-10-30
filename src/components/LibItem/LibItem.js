// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useNavigate } = require('react-router');
const { useNavigateWithOrigin } = require('stremio-router');
const { default: toPath } = require('stremio-router/toPath');
const PropTypes = require('prop-types');
const { useCore } = require('stremio/core');
const { default: getMetaDetailsHref } = require('stremio/common/getMetaDetailsHref');
const MetaItem = require('stremio/components/MetaItem');
const { t } = require('i18next');
const { categoryManager, useMihonCategories } = require('stremio/common/MihonCategories');
const { ratingsService, useRatings } = require('stremio/common/RatingsService');

const LibItem = ({ _id, removable, notifications, watched, detailsVideosFirst, ...props }) => {
    const navigate = useNavigate();
    const { navigateWithOrigin } = useNavigateWithOrigin();
    const core = useCore();
    const { getItemCategory } = useMihonCategories();
    const { getRating } = useRatings();

    // Auto-fallback to Completed if item was marked watched and has no custom category
    const itemCategory = React.useMemo(() => getItemCategory(_id, watched), [getItemCategory, _id, watched]);
    const imdbRating = React.useMemo(() => getRating(_id), [getRating, _id]);

    const detailsHref = React.useMemo(() => {
        const id = _id || props.id;
        if (!id) return null;
        const type = props.type || 'movie';

        // For movies: route directly to streams (#/detail/movie/:id/:id) so streams load immediately
        if (type === 'movie') {
            if (typeof props.deepLinks?.metaDetailsStreams === 'string') {
                return props.deepLinks.metaDetailsStreams;
            }
            return '#/detail/movie/' + id + '/' + id;
        }

        // For series: use getMetaDetailsHref with detailsVideosFirst so episodes list loads
        const href = getMetaDetailsHref(props.deepLinks, detailsVideosFirst);
        if (typeof href === 'string') return href;
        return '#/detail/' + type + '/' + id;
    }, [props.deepLinks, detailsVideosFirst, props.type, _id, props.id]);
    const playerHref = props.deepLinks && typeof props.deepLinks.player === 'string' ? props.deepLinks.player : null;


    const newVideos = React.useMemo(() => {
        const count = notifications.items?.[_id]?.length ?? 0;
        return Math.min(Math.max(count, 0), 99);
    }, [_id, notifications]);

    const options = React.useMemo(() => {
        return [
            { label: 'LIBRARY_PLAY', value: 'play' },
            { label: 'LIBRARY_DETAILS', value: 'details' },
            { label: 'Assign Category...', value: 'mihon_categories' },
            { label: 'LIBRARY_RESUME_DISMISS', value: 'dismiss' },
            { label: watched ? 'CTX_MARK_UNWATCHED' : 'CTX_MARK_WATCHED', value: 'watched' },
            { label: 'LIBRARY_REMOVE', value: 'remove' },
        ].filter(({ value }) => {
            switch (value) {
                case 'play':
                    return typeof playerHref === 'string';
                case 'details':
                    return typeof detailsHref === 'string';
                case 'mihon_categories':
                    return typeof _id === 'string';
                case 'watched':
                    return typeof watched !== 'undefined' && typeof detailsHref === 'string';
                case 'dismiss':
                    return typeof _id === 'string' && (typeof props.onDismissClick === 'function' || props.progress !== null && !isNaN(props.progress) && props.progress > 0);
                case 'remove':
                    return typeof _id === 'string' && removable;
            }
        }).map((option) => ({
            ...option,
            label: option.value === 'mihon_categories' ? option.label : t(option.label)
        }));
    }, [_id, removable, props.progress, props.onDismissClick, playerHref, detailsHref, watched]);

    const optionOnSelect = React.useCallback((event) => {
        if (typeof props.optionOnSelect === 'function') {
            props.optionOnSelect(event);
        }

        if (!event.nativeEvent.optionSelectPrevented) {
            switch (event.value) {
                case 'play': {
                    if (typeof playerHref === 'string') {
                        navigate(toPath(playerHref));
                    }

                    break;
                }
                case 'details': {
                    if (typeof detailsHref === 'string') {
                        navigateWithOrigin(detailsHref);
                    }

                    break;
                }
                case 'mihon_categories': {
                    if (typeof _id === 'string') {
                        categoryManager.openCategoryModal({
                            _id,
                            name: props.name,
                            poster: props.poster,
                            type: props.type
                        });
                    }

                    break;
                }
                case 'watched': {
                    if (typeof _id === 'string') {
                        core.transport.dispatch({
                            action: 'Ctx',
                            args: {
                                action: 'LibraryItemMarkAsWatched',
                                args: {
                                    id: _id,
                                    is_watched: !watched
                                }
                            }
                        });
                    }

                    break;
                }
                case 'dismiss': {
                    if (typeof _id === 'string') {
                        core.transport.dispatch({
                            action: 'Ctx',
                            args: {
                                action: 'RewindLibraryItem',
                                args: _id
                            }
                        });
                        core.transport.dispatch({
                            action: 'Ctx',
                            args: {
                                action: 'DismissNotificationItem',
                                args: _id
                            }
                        });
                    }

                    break;
                }
                case 'remove': {
                    if (typeof _id === 'string') {
                        core.transport.dispatch({
                            action: 'Ctx',
                            args: {
                                action: 'RemoveFromLibrary',
                                args: _id
                            }
                        });
                    }

                    break;
                }
            }
        }
    }, [_id, detailsHref, navigate, navigateWithOrigin, playerHref, props.optionOnSelect, props.name, props.poster, props.type, watched]);

    const onPlayClick = React.useCallback((event) => {
        event.preventDefault();
        if (typeof playerHref === 'string') {
            navigate(toPath(playerHref));
        }
    }, [navigate, playerHref]);

    const onContextMenu = React.useCallback((event) => {
        if (typeof _id === 'string') {
            event.preventDefault();
            event.stopPropagation();
            categoryManager.openCategoryModal({
                _id,
                name: props.name,
                poster: props.poster,
                type: props.type
            });
        }
    }, [_id, props.name, props.poster, props.type]);

    const posterWithOverlay = React.useMemo(() => {
        const originalSrc = props.poster && typeof props.poster === 'object' ? props.poster.src : props.poster;
        const hasCategory = Boolean(itemCategory);
        const hasRating = typeof imdbRating === 'number' && !isNaN(imdbRating);

        if (!hasCategory && !hasRating) {
            return props.poster;
        }

        const isCompleted = itemCategory === 'Completed';

        return {
            src: originalSrc,
            shape: props.posterShape,
            changeCursor: props.posterChangeCursor,
            overlay: (
                <React.Fragment>
                    {/* Top-Left: Category Badge */}
                    {hasCategory && (
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                categoryManager.openCategoryModal({
                                    _id,
                                    name: props.name,
                                    poster: props.poster,
                                    type: props.type
                                });
                            }}
                            title="Click to change category"
                            style={{
                                position: 'absolute',
                                top: '0.4rem',
                                left: '0.4rem',
                                zIndex: 3,
                                maxWidth: hasRating ? 'calc(100% - 3.8rem)' : 'calc(100% - 0.8rem)',
                                overflow: 'hidden',
                                pointerEvents: 'auto',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{
                                fontSize: '0.65rem',
                                fontWeight: '600',
                                backgroundColor: isCompleted ? 'rgba(39, 174, 96, 0.95)' : 'rgba(115, 92, 230, 0.95)',
                                color: '#ffffff',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.6)',
                                display: 'inline-block'
                            }}>
                                {isCompleted ? '✓ Completed' : itemCategory}
                            </span>
                        </div>
                    )}

                    {/* Top-Right: Gold IMDb Rating Badge */}
                    {hasRating && (
                        <div style={{
                            position: 'absolute',
                            top: '0.4rem',
                            right: newVideos > 0 ? '2.4rem' : '0.4rem',
                            zIndex: 2,
                            pointerEvents: 'none'
                        }}>
                            <span style={{
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                backgroundColor: '#f5c518',
                                color: '#000000',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.6)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.15rem'
                            }}>
                                ★ {imdbRating.toFixed(1)}
                            </span>
                        </div>
                    )}
                </React.Fragment>
            )
        };
    }, [props.poster, props.posterShape, props.posterChangeCursor, itemCategory, imdbRating, newVideos]);

    return (
        <MetaItem
            {...props}
            poster={posterWithOverlay}
            onContextMenu={onContextMenu}
            href={detailsHref}
            watched={false}
            newVideos={newVideos}
            options={options}
            optionOnSelect={optionOnSelect}
            onPlayClick={typeof playerHref === 'string' && props.progress > 0 ? onPlayClick : null}
        />
    );
};

LibItem.propTypes = {
    _id: PropTypes.string,
    removable: PropTypes.bool,
    progress: PropTypes.number,
    notifications: PropTypes.object,
    watched: PropTypes.bool,
    detailsVideosFirst: PropTypes.bool,
    actionMenu: PropTypes.bool,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    }),
    optionOnSelect: PropTypes.func,
    onDismissClick: PropTypes.func
};

module.exports = LibItem;
